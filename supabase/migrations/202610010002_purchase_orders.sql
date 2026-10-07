do $$
begin
  create type public.purchase_order_status as enum ('draft', 'confirmed', 'partially_received', 'completed', 'cancelled');
exception when duplicate_object then null;
end $$;

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  supplier_id uuid not null references public.suppliers(id),
  supplier_name_snapshot text not null,
  status public.purchase_order_status not null default 'draft',
  total_amount numeric(12, 2) not null default 0 check (total_amount >= 0),
  payment_status public.payment_status not null default 'unpaid',
  remark text,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_by uuid references public.users(id),
  confirmed_at timestamptz,
  cancelled_by uuid references public.users(id),
  cancelled_at timestamptz
);

create table public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  received_quantity integer not null default 0 check (received_quantity >= 0 and received_quantity <= quantity),
  unit_cost numeric(12, 2) not null check (unit_cost >= 0),
  product_name_snapshot text not null,
  sku_snapshot text not null,
  unique (purchase_order_id, product_id)
);

create trigger purchase_orders_touch_updated_at
before update on public.purchase_orders
for each row execute function public.touch_updated_at();

create or replace function public.protect_purchase_order()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('app.allow_purchase_mutation', true), 'off') <> 'on' then
    if old.status <> 'draft' or (tg_op = 'UPDATE' and new.status <> 'draft') then
      raise exception 'PURCHASE_NOT_EDITABLE';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger purchase_orders_protection
before update or delete on public.purchase_orders
for each row execute function public.protect_purchase_order();

create or replace function public.protect_purchase_order_item()
returns trigger
language plpgsql
as $$
declare
  v_status public.purchase_order_status;
begin
  select status into v_status
  from public.purchase_orders
  where id = coalesce(new.purchase_order_id, old.purchase_order_id);
  if v_status <> 'draft' and coalesce(current_setting('app.allow_purchase_mutation', true), 'off') <> 'on' then
    raise exception 'PURCHASE_NOT_EDITABLE';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger purchase_order_items_protection
before update or delete on public.purchase_order_items
for each row execute function public.protect_purchase_order_item();

revoke all on public.purchase_orders, public.purchase_order_items from anon, authenticated;
grant usage on type public.purchase_order_status to authenticated;
grant select on public.purchase_orders, public.purchase_order_items to authenticated;

alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;

create policy purchase_orders_select_active
on public.purchase_orders for select to authenticated
using (public.is_active_user());

create policy purchase_order_items_select_active
on public.purchase_order_items for select to authenticated
using (public.is_active_user());

create or replace function public.save_purchase_order_draft(
  p_order_id uuid,
  p_supplier_id uuid,
  p_remark text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_supplier_name text;
  v_item_count integer;
  v_inserted_count integer;
  v_total numeric(12, 2);
begin
  if not public.is_active_user() then
    raise exception 'active user required' using errcode = '42501';
  end if;

  select name into v_supplier_name
  from public.suppliers
  where id = p_supplier_id and status = 'active';
  if v_supplier_name is null then raise exception 'SUPPLIER_INACTIVE'; end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'purchase items required';
  end if;

  select count(*) into v_item_count from jsonb_array_elements(p_items);
  if exists (
    select 1 from jsonb_array_elements(p_items) item
    group by item->>'productId' having count(*) > 1
  ) then raise exception 'DUPLICATE_PRODUCT'; end if;

  if exists (
    select 1 from jsonb_array_elements(p_items) item
    where nullif(item->>'productId', '') is null
      or nullif(item->>'quantity', '') is null
      or nullif(item->>'unitCost', '') is null
      or (item->>'quantity')::integer <= 0
      or (item->>'unitCost')::numeric < 0
  ) then raise exception 'invalid purchase item'; end if;

  if p_order_id is null then
    insert into public.purchase_orders (order_no, supplier_id, supplier_name_snapshot, remark, created_by)
    values ('CG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)), p_supplier_id, v_supplier_name, nullif(trim(p_remark), ''), auth.uid())
    returning id into v_order_id;
  else
    select id into v_order_id from public.purchase_orders where id = p_order_id and status = 'draft' for update;
    if v_order_id is null then raise exception 'PURCHASE_NOT_EDITABLE'; end if;
    update public.purchase_orders
    set supplier_id = p_supplier_id,
        supplier_name_snapshot = v_supplier_name,
        remark = nullif(trim(p_remark), '')
    where id = v_order_id;
    delete from public.purchase_order_items where purchase_order_id = v_order_id;
  end if;

  insert into public.purchase_order_items (
    purchase_order_id, product_id, quantity, unit_cost, product_name_snapshot, sku_snapshot
  )
  select
    v_order_id,
    p.id,
    (item->>'quantity')::integer,
    round((item->>'unitCost')::numeric, 2),
    p.name,
    p.sku
  from jsonb_array_elements(p_items) item
  join public.products p on p.id = (item->>'productId')::uuid;

  get diagnostics v_inserted_count = row_count;
  if v_inserted_count <> v_item_count then raise exception 'product not found'; end if;

  select round(sum(quantity * unit_cost), 2) into v_total
  from public.purchase_order_items where purchase_order_id = v_order_id;
  update public.purchase_orders set total_amount = v_total where id = v_order_id;
  return v_order_id;
end;
$$;

create or replace function public.confirm_purchase_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.purchase_orders%rowtype;
begin
  if not public.is_active_user() then raise exception 'active user required' using errcode = '42501'; end if;
  select * into v_order from public.purchase_orders where id = p_order_id for update;
  if not found or v_order.status <> 'draft' then raise exception 'PURCHASE_NOT_EDITABLE'; end if;
  if not exists (select 1 from public.suppliers where id = v_order.supplier_id and status = 'active') then raise exception 'SUPPLIER_INACTIVE'; end if;
  if not exists (select 1 from public.purchase_order_items where purchase_order_id = p_order_id) then raise exception 'purchase items required'; end if;
  perform set_config('app.allow_purchase_mutation', 'on', true);
  update public.purchase_orders
  set status = 'confirmed', confirmed_by = auth.uid(), confirmed_at = now()
  where id = p_order_id;
end;
$$;

create or replace function public.cancel_purchase_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.purchase_orders%rowtype;
begin
  if not public.is_active_user() then raise exception 'active user required' using errcode = '42501'; end if;
  select * into v_order from public.purchase_orders where id = p_order_id for update;
  if not found
    or v_order.status not in ('draft', 'confirmed')
    or v_order.payment_status <> 'unpaid'
    or exists (select 1 from public.purchase_order_items where purchase_order_id = p_order_id and received_quantity > 0)
  then raise exception 'PURCHASE_NOT_CANCELLABLE'; end if;
  perform set_config('app.allow_purchase_mutation', 'on', true);
  update public.purchase_orders
  set status = 'cancelled', cancelled_by = auth.uid(), cancelled_at = now()
  where id = p_order_id;
end;
$$;

create or replace function public.get_purchase_order(p_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', o.id,
    'orderNo', o.order_no,
    'supplierId', o.supplier_id,
    'supplierName', o.supplier_name_snapshot,
    'status', o.status,
    'totalAmount', o.total_amount,
    'paymentStatus', o.payment_status,
    'remark', o.remark,
    'createdAt', o.created_at,
    'confirmedAt', o.confirmed_at,
    'cancelledAt', o.cancelled_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'productId', i.product_id,
        'productName', i.product_name_snapshot,
        'sku', i.sku_snapshot,
        'quantity', i.quantity,
        'receivedQuantity', i.received_quantity,
        'unitCost', i.unit_cost,
        'amount', i.quantity * i.unit_cost
      ) order by i.id)
      from public.purchase_order_items i where i.purchase_order_id = o.id
    ), '[]'::jsonb)
  )
  from public.purchase_orders o
  where o.id = p_order_id and public.is_active_user()
$$;

create or replace function public.list_purchase_orders(
  p_query text default '',
  p_supplier_id uuid default null,
  p_status public.purchase_order_status default null,
  p_payment_status public.payment_status default null,
  p_date date default null
)
returns table (
  id uuid,
  order_no text,
  supplier_name text,
  status public.purchase_order_status,
  total_amount numeric,
  payment_status public.payment_status,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.order_no, o.supplier_name_snapshot, o.status, o.total_amount, o.payment_status, o.created_at
  from public.purchase_orders o
  where public.is_active_user()
    and (p_supplier_id is null or o.supplier_id = p_supplier_id)
    and (p_status is null or o.status = p_status)
    and (p_payment_status is null or o.payment_status = p_payment_status)
    and (p_date is null or o.created_at::date = p_date)
    and (nullif(trim(p_query), '') is null or o.order_no ilike '%' || trim(p_query) || '%' or o.supplier_name_snapshot ilike '%' || trim(p_query) || '%')
  order by o.created_at desc
$$;

revoke execute on function public.save_purchase_order_draft(uuid, uuid, text, jsonb) from public, anon;
revoke execute on function public.confirm_purchase_order(uuid) from public, anon;
revoke execute on function public.cancel_purchase_order(uuid) from public, anon;
revoke execute on function public.get_purchase_order(uuid) from public, anon;
revoke execute on function public.list_purchase_orders(text, uuid, public.purchase_order_status, public.payment_status, date) from public, anon;

grant execute on function public.save_purchase_order_draft(uuid, uuid, text, jsonb) to authenticated;
grant execute on function public.confirm_purchase_order(uuid) to authenticated;
grant execute on function public.cancel_purchase_order(uuid) to authenticated;
grant execute on function public.get_purchase_order(uuid) to authenticated;
grant execute on function public.list_purchase_orders(text, uuid, public.purchase_order_status, public.payment_status, date) to authenticated;
