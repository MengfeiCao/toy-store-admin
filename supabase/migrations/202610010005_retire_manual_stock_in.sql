create or replace function public.save_stock_in_draft(
  p_order_id uuid default null,
  p_remark text default null,
  p_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_user() then raise exception 'active user required' using errcode = '42501'; end if;
  raise exception 'MANUAL_STOCK_IN_DISABLED';
end;
$$;

create or replace function public.post_stock_in(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_user() then raise exception 'active user required' using errcode = '42501'; end if;
  raise exception 'MANUAL_STOCK_IN_DISABLED';
end;
$$;

create or replace function public.list_stock_in_history(
  p_query text default '',
  p_status public.stock_in_status default null,
  p_date date default null
)
returns table (
  id uuid,
  order_no text,
  status public.stock_in_status,
  total_quantity integer,
  created_at timestamptz,
  posted_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.order_no, o.status, coalesce(sum(i.quantity), 0)::integer, o.created_at, o.posted_at
  from public.stock_in_orders o
  left join public.stock_in_items i on i.stock_in_order_id = o.id
  where public.is_active_user()
    and (p_status is null or o.status = p_status)
    and (p_date is null or o.created_at::date = p_date)
    and (nullif(trim(p_query), '') is null or o.order_no ilike '%' || trim(p_query) || '%')
  group by o.id
  order by o.created_at desc;
$$;

create or replace function public.list_stock_records(
  p_product_id uuid default null,
  p_source text default null,
  p_date date default null
)
returns table (
  id uuid,
  product_id uuid,
  product_name text,
  sku text,
  quantity_delta integer,
  source text,
  source_order_no text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.product_id,
    p.name,
    p.sku,
    r.quantity_delta,
    case
      when r.stock_in_item_id is not null then 'stock_in'
      when r.sales_order_item_id is not null then 'sales'
      when r.purchase_receipt_item_id is not null then 'purchase_receipt'
      when a.type = 'stock_count' then 'stock_count'
      when a.type = 'surplus' then 'surplus'
      when a.type = 'shortage' then 'shortage'
      when a.type = 'damage' then 'damage'
      else 'manual'
    end,
    coalesce(si.order_no, so.order_no, pr.receipt_no, a.adjustment_no),
    r.created_at
  from public.stock_records r
  join public.products p on p.id = r.product_id
  left join public.stock_in_items sii on sii.id = r.stock_in_item_id
  left join public.stock_in_orders si on si.id = sii.stock_in_order_id
  left join public.sales_order_items soi on soi.id = r.sales_order_item_id
  left join public.sales_orders so on so.id = soi.sales_order_id
  left join public.purchase_receipt_items pri on pri.id = r.purchase_receipt_item_id
  left join public.purchase_receipts pr on pr.id = pri.purchase_receipt_id
  left join public.stock_adjustment_items ai on ai.id = r.stock_adjustment_item_id
  left join public.stock_adjustments a on a.id = ai.stock_adjustment_id
  where public.is_active_user()
    and (p_product_id is null or r.product_id = p_product_id)
    and (p_source is null or p_source = case
      when r.stock_in_item_id is not null then 'stock_in'
      when r.sales_order_item_id is not null then 'sales'
      when r.purchase_receipt_item_id is not null then 'purchase_receipt'
      when a.type = 'stock_count' then 'stock_count'
      when a.type = 'surplus' then 'surplus'
      when a.type = 'shortage' then 'shortage'
      when a.type = 'damage' then 'damage'
      else 'manual'
    end)
    and (p_date is null or r.created_at::date = p_date)
  order by r.created_at desc;
$$;

revoke execute on function public.list_stock_in_history(text, public.stock_in_status, date) from public, anon;
grant execute on function public.list_stock_in_history(text, public.stock_in_status, date) to authenticated;

create or replace function public.get_dashboard(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_sales numeric(12, 2);
  v_orders integer;
  v_pending integer;
  v_cost numeric(12, 2);
begin
  if not public.is_active_user() then raise exception 'active user required' using errcode = '42501'; end if;
  select coalesce(sum(total_amount), 0), count(*)
  into v_sales, v_orders
  from public.sales_orders
  where status = 'completed' and timezone('Asia/Shanghai', shipped_at)::date between p_from and p_to;
  select count(*) into v_pending from public.sales_orders where status = 'pending_shipment';
  if public.current_user_role() = 'owner' then
    select coalesce(sum(i.quantity * i.unit_cost_snapshot), 0) into v_cost
    from public.sales_order_items i join public.sales_orders o on o.id = i.sales_order_id
    where o.status = 'completed' and timezone('Asia/Shanghai', o.shipped_at)::date between p_from and p_to;
    return jsonb_build_object('role', 'owner', 'salesAmount', v_sales, 'costAmount', v_cost, 'grossProfit', v_sales - v_cost, 'orderCount', v_orders);
  end if;
  return jsonb_build_object('role', 'staff', 'salesAmount', v_sales, 'orderCount', v_orders, 'pendingShipmentCount', v_pending);
end;
$$;
