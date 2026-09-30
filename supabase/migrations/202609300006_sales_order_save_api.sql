create or replace function public.save_sales_order(
  p_order_id uuid default null,
  p_customer_id uuid default null,
  p_remark text default null,
  p_items jsonb default '[]'::jsonb,
  p_confirm boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid := p_order_id;
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_total numeric(12, 2);
begin
  if not public.is_active_user() then
    raise exception 'active user required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'at least one sales item is required' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'productId')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;
    if v_quantity is null or v_quantity <= 0 then
      raise exception 'sales quantity must be positive' using errcode = '22023';
    end if;
    if not exists (select 1 from public.products where id = v_product_id and status = 'active') then
      raise exception 'product is inactive or missing' using errcode = 'P0002';
    end if;
  end loop;

  if v_order_id is null then
    insert into public.sales_orders (order_no, customer_id, remark, created_by)
    values ('XS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)), p_customer_id, nullif(trim(p_remark), ''), auth.uid())
    returning id into v_order_id;
  else
    perform 1 from public.sales_orders where id = v_order_id and created_by = auth.uid() and status = 'draft' for update;
    if not found then raise exception 'draft sales order not found' using errcode = 'P0002'; end if;
    update public.sales_orders set customer_id = p_customer_id, remark = nullif(trim(p_remark), '') where id = v_order_id;
    delete from public.sales_order_items where sales_order_id = v_order_id;
  end if;

  insert into public.sales_order_items (sales_order_id, product_id, quantity, product_name_snapshot, sku_snapshot, unit_price, unit_cost_snapshot)
  select v_order_id, p.id, sum((item.value ->> 'quantity')::integer), p.name, p.sku, p.sale_price,
    case when public.current_user_role() = 'owner' then p.cost_price else null end
  from jsonb_array_elements(p_items) item
  join public.products p on p.id = (item.value ->> 'productId')::uuid
  group by p.id, p.name, p.sku, p.sale_price, p.cost_price;

  select coalesce(sum(quantity * unit_price), 0)::numeric(12, 2) into v_total from public.sales_order_items where sales_order_id = v_order_id;
  update public.sales_orders
  set total_amount = v_total,
      status = case when p_confirm then 'pending_shipment'::public.sales_order_status else 'draft'::public.sales_order_status end,
      confirmed_by = case when p_confirm then auth.uid() else null end,
      confirmed_at = case when p_confirm then now() else null end
  where id = v_order_id;
  return v_order_id;
end;
$$;

create or replace function public.get_sales_order(p_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', o.id,
    'orderNo', o.order_no,
    'customerId', o.customer_id,
    'customerName', coalesce(c.name, '散客'),
    'status', o.status,
    'totalAmount', o.total_amount,
    'paymentStatus', o.payment_status,
    'remark', o.remark,
    'items', coalesce((select jsonb_agg(jsonb_build_object('productId', i.product_id, 'productName', i.product_name_snapshot, 'sku', i.sku_snapshot, 'quantity', i.quantity, 'unitPrice', i.unit_price) order by i.id) from public.sales_order_items i where i.sales_order_id = o.id), '[]'::jsonb)
  )
  from public.sales_orders o
  left join public.customers c on c.id = o.customer_id
  where o.id = p_order_id and public.is_active_user() and (o.created_by = auth.uid() or public.current_user_role() = 'owner');
$$;

create or replace function public.list_sales_orders(
  p_query text default '',
  p_status text default null,
  p_payment_status text default null,
  p_date date default null
)
returns table (id uuid, order_no text, customer_name text, status public.sales_order_status, total_amount numeric, payment_status public.payment_status, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.order_no, coalesce(c.name, '散客'), o.status, o.total_amount, o.payment_status, o.created_at
  from public.sales_orders o left join public.customers c on c.id = o.customer_id
  where public.is_active_user()
    and (nullif(trim(p_query), '') is null or o.order_no ilike '%' || trim(p_query) || '%' or coalesce(c.name, '散客') ilike '%' || trim(p_query) || '%')
    and (p_status is null or o.status::text = p_status)
    and (p_payment_status is null or o.payment_status::text = p_payment_status)
    and (p_date is null or o.created_at::date = p_date)
  order by o.created_at desc;
$$;

create or replace function public.cancel_sales_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_user() then raise exception 'active user required' using errcode = '42501'; end if;
  update public.sales_orders
  set status = 'cancelled'
  where id = p_order_id and (created_by = auth.uid() or public.current_user_role() = 'owner') and status in ('draft', 'pending_shipment');
  if not found then raise exception 'sales order cannot be cancelled' using errcode = 'P0002'; end if;
end;
$$;

grant execute on function public.save_sales_order(uuid, uuid, text, jsonb, boolean) to authenticated;
grant execute on function public.get_sales_order(uuid) to authenticated;
grant execute on function public.list_sales_orders(text, text, text, date) to authenticated;
grant execute on function public.cancel_sales_order(uuid) to authenticated;
