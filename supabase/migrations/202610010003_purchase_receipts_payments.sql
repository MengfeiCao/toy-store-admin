create table public.purchase_receipts (
  id uuid primary key,
  receipt_no text not null unique,
  purchase_order_id uuid not null references public.purchase_orders(id),
  supplier_name_snapshot text not null,
  received_by uuid not null references public.users(id),
  received_at timestamptz not null default now(),
  remark text,
  request_payload jsonb not null
);

create table public.purchase_receipt_items (
  id uuid primary key default gen_random_uuid(),
  purchase_receipt_id uuid not null references public.purchase_receipts(id),
  purchase_order_item_id uuid not null references public.purchase_order_items(id),
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  unit_cost_snapshot numeric(12, 2) not null check (unit_cost_snapshot >= 0),
  product_name_snapshot text not null,
  sku_snapshot text not null,
  unique (purchase_receipt_id, purchase_order_item_id)
);

create table public.supplier_payments (
  id uuid primary key,
  purchase_order_id uuid not null unique references public.purchase_orders(id),
  amount numeric(12, 2) not null check (amount >= 0),
  paid_by uuid not null references public.users(id),
  paid_at timestamptz not null default now(),
  request_payload jsonb not null
);

alter table public.stock_records
  add column purchase_receipt_item_id uuid references public.purchase_receipt_items(id);

alter table public.stock_records drop constraint stock_records_check;
alter table public.stock_records add constraint stock_records_source_check check (
  (stock_in_item_id is not null)::integer
  + (sales_order_item_id is not null)::integer
  + (purchase_receipt_item_id is not null)::integer = 1
);

create unique index stock_records_purchase_receipt_item_unique
  on public.stock_records (purchase_receipt_item_id)
  where purchase_receipt_item_id is not null;

create trigger purchase_receipts_immutable
before update or delete on public.purchase_receipts
for each row execute function public.protect_stock_records();

create trigger purchase_receipt_items_immutable
before update or delete on public.purchase_receipt_items
for each row execute function public.protect_stock_records();

create trigger supplier_payments_immutable
before update or delete on public.supplier_payments
for each row execute function public.protect_stock_records();

revoke all on public.purchase_receipts, public.purchase_receipt_items, public.supplier_payments from anon, authenticated;
grant select on public.purchase_receipts, public.purchase_receipt_items, public.supplier_payments to authenticated;

alter table public.purchase_receipts enable row level security;
alter table public.purchase_receipt_items enable row level security;
alter table public.supplier_payments enable row level security;

create policy purchase_receipts_select_active on public.purchase_receipts
for select to authenticated using (public.is_active_user());
create policy purchase_receipt_items_select_active on public.purchase_receipt_items
for select to authenticated using (public.is_active_user());
create policy supplier_payments_select_active on public.supplier_payments
for select to authenticated using (public.is_active_user());

create or replace function public.post_purchase_receipt(
  p_request_id uuid,
  p_purchase_order_id uuid,
  p_remark text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.purchase_orders%rowtype;
  v_existing_payload jsonb;
  v_payload jsonb;
  v_item_count integer;
  v_valid_count integer;
begin
  if not public.is_active_user() then raise exception 'active user required' using errcode = '42501'; end if;
  if p_request_id is null then raise exception 'request id required'; end if;

  v_payload := jsonb_build_object(
    'purchaseOrderId', p_purchase_order_id,
    'remark', nullif(trim(p_remark), ''),
    'items', p_items
  );

  select request_payload into v_existing_payload from public.purchase_receipts where id = p_request_id;
  if found then
    if v_existing_payload = v_payload then return p_request_id; end if;
    raise exception 'REQUEST_ID_CONFLICT';
  end if;

  select * into v_order from public.purchase_orders where id = p_purchase_order_id for update;
  if not found or v_order.status not in ('confirmed', 'partially_received') then raise exception 'PURCHASE_NOT_RECEIVABLE'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'receipt items required'; end if;

  select count(*) into v_item_count from jsonb_array_elements(p_items);
  if exists (
    select 1 from jsonb_array_elements(p_items) item
    group by item->>'purchaseOrderItemId' having count(*) > 1
  ) then raise exception 'DUPLICATE_PRODUCT'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) item
    where nullif(item->>'purchaseOrderItemId', '') is null
      or nullif(item->>'quantity', '') is null
      or (item->>'quantity')::integer <= 0
  ) then raise exception 'invalid receipt item'; end if;

  perform 1 from public.purchase_order_items
  where purchase_order_id = p_purchase_order_id
  order by id
  for update;

  select count(*) into v_valid_count
  from jsonb_array_elements(p_items) item
  join public.purchase_order_items poi
    on poi.id = (item->>'purchaseOrderItemId')::uuid
   and poi.purchase_order_id = p_purchase_order_id;
  if v_valid_count <> v_item_count then raise exception 'purchase item not found'; end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) item
    join public.purchase_order_items poi on poi.id = (item->>'purchaseOrderItemId')::uuid
    where (item->>'quantity')::integer > poi.quantity - poi.received_quantity
  ) then raise exception 'OVER_RECEIPT'; end if;

  insert into public.purchase_receipts (
    id, receipt_no, purchase_order_id, supplier_name_snapshot, received_by, remark, request_payload
  ) values (
    p_request_id,
    'DH-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
    p_purchase_order_id,
    v_order.supplier_name_snapshot,
    auth.uid(),
    nullif(trim(p_remark), ''),
    v_payload
  );

  insert into public.purchase_receipt_items (
    purchase_receipt_id, purchase_order_item_id, product_id, quantity,
    unit_cost_snapshot, product_name_snapshot, sku_snapshot
  )
  select
    p_request_id,
    poi.id,
    poi.product_id,
    (item->>'quantity')::integer,
    poi.unit_cost,
    poi.product_name_snapshot,
    poi.sku_snapshot
  from jsonb_array_elements(p_items) item
  join public.purchase_order_items poi on poi.id = (item->>'purchaseOrderItemId')::uuid;

  perform set_config('app.allow_stock_mutation', 'on', true);
  update public.products p
  set stock_qty = p.stock_qty + received.quantity,
      cost_price = received.unit_cost
  from (
    select product_id, sum(quantity)::integer as quantity, max(unit_cost_snapshot) as unit_cost
    from public.purchase_receipt_items
    where purchase_receipt_id = p_request_id
    group by product_id
  ) received
  where p.id = received.product_id;

  perform set_config('app.allow_purchase_mutation', 'on', true);
  update public.purchase_order_items poi
  set received_quantity = poi.received_quantity + received.quantity
  from (
    select purchase_order_item_id, sum(quantity)::integer as quantity
    from public.purchase_receipt_items
    where purchase_receipt_id = p_request_id
    group by purchase_order_item_id
  ) received
  where poi.id = received.purchase_order_item_id;

  insert into public.stock_records (product_id, quantity_delta, purchase_receipt_item_id, created_by)
  select product_id, quantity, id, auth.uid()
  from public.purchase_receipt_items
  where purchase_receipt_id = p_request_id;

  update public.purchase_orders
  set status = case
    when exists (select 1 from public.purchase_order_items where purchase_order_id = p_purchase_order_id and received_quantity < quantity)
      then 'partially_received'::public.purchase_order_status
    else 'completed'::public.purchase_order_status
  end
  where id = p_purchase_order_id;

  return p_request_id;
end;
$$;

create or replace function public.mark_purchase_order_paid(
  p_request_id uuid,
  p_purchase_order_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.purchase_orders%rowtype;
  v_payload jsonb;
  v_existing_payload jsonb;
begin
  if not public.is_active_user() then raise exception 'active user required' using errcode = '42501'; end if;
  if p_request_id is null then raise exception 'request id required'; end if;
  v_payload := jsonb_build_object('purchaseOrderId', p_purchase_order_id);

  select request_payload into v_existing_payload from public.supplier_payments where id = p_request_id;
  if found then
    if v_existing_payload = v_payload then return p_request_id; end if;
    raise exception 'REQUEST_ID_CONFLICT';
  end if;

  select * into v_order from public.purchase_orders where id = p_purchase_order_id for update;
  if not found or v_order.status in ('draft', 'cancelled') then raise exception 'PURCHASE_NOT_PAYABLE'; end if;
  if v_order.payment_status = 'paid' or exists (select 1 from public.supplier_payments where purchase_order_id = p_purchase_order_id) then
    raise exception 'PURCHASE_ALREADY_PAID';
  end if;

  insert into public.supplier_payments (id, purchase_order_id, amount, paid_by, request_payload)
  values (p_request_id, p_purchase_order_id, v_order.total_amount, auth.uid(), v_payload);

  perform set_config('app.allow_purchase_mutation', 'on', true);
  update public.purchase_orders set payment_status = 'paid' where id = p_purchase_order_id;
  return p_request_id;
end;
$$;

create or replace function public.list_purchase_receipts(
  p_query text default '',
  p_purchase_order_id uuid default null,
  p_supplier_id uuid default null,
  p_date date default null
)
returns table (
  id uuid,
  receipt_no text,
  purchase_order_id uuid,
  purchase_order_no text,
  supplier_name text,
  received_at timestamptz,
  total_quantity integer
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.receipt_no, r.purchase_order_id, o.order_no, r.supplier_name_snapshot, r.received_at, sum(i.quantity)::integer
  from public.purchase_receipts r
  join public.purchase_orders o on o.id = r.purchase_order_id
  join public.purchase_receipt_items i on i.purchase_receipt_id = r.id
  where public.is_active_user()
    and (p_purchase_order_id is null or r.purchase_order_id = p_purchase_order_id)
    and (p_supplier_id is null or o.supplier_id = p_supplier_id)
    and (p_date is null or r.received_at::date = p_date)
    and (nullif(trim(p_query), '') is null or r.receipt_no ilike '%' || trim(p_query) || '%' or o.order_no ilike '%' || trim(p_query) || '%' or r.supplier_name_snapshot ilike '%' || trim(p_query) || '%')
  group by r.id, o.order_no
  order by r.received_at desc
$$;

create or replace function public.get_purchase_receipt(p_receipt_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', r.id,
    'receiptNo', r.receipt_no,
    'purchaseOrderId', r.purchase_order_id,
    'purchaseOrderNo', o.order_no,
    'supplierName', r.supplier_name_snapshot,
    'receivedAt', r.received_at,
    'remark', r.remark,
    'items', coalesce((select jsonb_agg(jsonb_build_object(
      'id', i.id,
      'purchaseOrderItemId', i.purchase_order_item_id,
      'productId', i.product_id,
      'productName', i.product_name_snapshot,
      'sku', i.sku_snapshot,
      'quantity', i.quantity,
      'unitCost', i.unit_cost_snapshot
    ) order by i.id) from public.purchase_receipt_items i where i.purchase_receipt_id = r.id), '[]'::jsonb)
  )
  from public.purchase_receipts r
  join public.purchase_orders o on o.id = r.purchase_order_id
  where r.id = p_receipt_id and public.is_active_user()
$$;

create or replace function public.get_supplier_payment(p_payment_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', p.id,
    'purchaseOrderId', p.purchase_order_id,
    'amount', p.amount,
    'paidAt', p.paid_at
  )
  from public.supplier_payments p
  where p.id = p_payment_id and public.is_active_user()
$$;

revoke execute on function public.post_purchase_receipt(uuid, uuid, text, jsonb) from public, anon;
revoke execute on function public.mark_purchase_order_paid(uuid, uuid) from public, anon;
revoke execute on function public.list_purchase_receipts(text, uuid, uuid, date) from public, anon;
revoke execute on function public.get_purchase_receipt(uuid) from public, anon;
revoke execute on function public.get_supplier_payment(uuid) from public, anon;
grant execute on function public.post_purchase_receipt(uuid, uuid, text, jsonb) to authenticated;
grant execute on function public.mark_purchase_order_paid(uuid, uuid) to authenticated;
grant execute on function public.list_purchase_receipts(text, uuid, uuid, date) to authenticated;
grant execute on function public.get_purchase_receipt(uuid) to authenticated;
grant execute on function public.get_supplier_payment(uuid) to authenticated;
