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
