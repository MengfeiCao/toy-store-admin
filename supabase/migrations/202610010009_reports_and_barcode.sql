create or replace function public.get_product_by_barcode(p_barcode text)
returns table(id uuid, sku text, barcode text, name text, sale_price numeric, stock_qty integer)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.sku, p.barcode, p.name, p.sale_price, p.stock_qty
  from public.products p
  where public.is_active_user()
    and p.status = 'active'
    and nullif(trim(p_barcode), '') is not null
    and p.barcode = trim(p_barcode);
$$;

create or replace function public.list_slow_moving_products(p_days integer default 30)
returns table(id uuid, sku text, name text, stock_qty integer, last_sold_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_active_user() then
    raise exception 'active user required' using errcode = '42501';
  end if;
  if p_days is null or p_days < 1 then
    raise exception 'days must be positive';
  end if;
  return query
  select p.id, p.sku, p.name, p.stock_qty, max(o.shipped_at)
  from public.products p
  left join public.sales_order_items i on i.product_id = p.id
  left join public.sales_orders o on o.id = i.sales_order_id and o.status = 'completed'
  where p.status = 'active' and p.stock_qty > 0
  group by p.id, p.sku, p.name, p.stock_qty
  having max(o.shipped_at) is null or max(o.shipped_at) < now() - make_interval(days => p_days)
  order by max(o.shipped_at) nulls first, p.name;
end;
$$;

create or replace function public.get_business_report(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_is_owner boolean;
  v_gross_sales numeric(12,2);
  v_refund_amount numeric(12,2);
  v_original_cost numeric(12,2);
  v_exchange_cost numeric(12,2);
  v_return_cost numeric(12,2);
  v_order_count integer;
  v_summary jsonb;
  v_daily jsonb;
  v_products jsonb;
  v_inventory jsonb;
  v_purchases jsonb;
  v_after_sales jsonb;
  v_slow_moving jsonb;
begin
  if not public.is_active_user() then
    raise exception 'active user required' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'invalid date range';
  end if;
  v_is_owner := public.current_user_role() = 'owner';

  select coalesce(sum(o.total_amount), 0), count(*)::integer
  into v_gross_sales, v_order_count
  from public.sales_orders o
  where o.status = 'completed'
    and timezone('Asia/Shanghai', o.shipped_at)::date between p_from and p_to;

  select coalesce(sum(r.amount), 0)
  into v_refund_amount
  from public.refunds r
  join public.after_sales_orders ao on ao.id = r.after_sales_order_id
  where timezone('Asia/Shanghai', ao.completed_at)::date between p_from and p_to;

  select coalesce(sum(i.quantity * coalesce(i.unit_cost_snapshot, 0)), 0)
  into v_original_cost
  from public.sales_order_items i
  join public.sales_orders o on o.id = i.sales_order_id
  where o.status = 'completed'
    and timezone('Asia/Shanghai', o.shipped_at)::date between p_from and p_to;

  select
    coalesce(sum(case when ao.type = 'exchange' then ai.quantity * coalesce(ai.unit_cost_snapshot, 0) else 0 end), 0),
    coalesce(sum(case when ai.condition = 'good' then ai.quantity * coalesce(ai.unit_cost_snapshot, 0) else 0 end), 0)
  into v_exchange_cost, v_return_cost
  from public.after_sales_items ai
  join public.after_sales_orders ao on ao.id = ai.after_sales_order_id
  where timezone('Asia/Shanghai', ao.completed_at)::date between p_from and p_to;

  v_summary := jsonb_build_object(
    'grossSales', v_gross_sales,
    'refundAmount', v_refund_amount,
    'netSales', v_gross_sales - v_refund_amount,
    'orderCount', v_order_count
  );
  if v_is_owner then
    v_summary := v_summary || jsonb_build_object(
      'netCost', v_original_cost + v_exchange_cost - v_return_cost,
      'grossProfit', v_gross_sales - v_refund_amount - v_original_cost - v_exchange_cost + v_return_cost
    );
  end if;

  with days as (
    select generate_series(p_from, p_to, interval '1 day')::date as report_date
  ), sales as (
    select timezone('Asia/Shanghai', o.shipped_at)::date report_date,
      sum(o.total_amount) gross_sales,
      count(*)::integer order_count,
      sum((select coalesce(sum(i.quantity * coalesce(i.unit_cost_snapshot, 0)), 0) from public.sales_order_items i where i.sales_order_id = o.id)) original_cost
    from public.sales_orders o
    where o.status = 'completed' and timezone('Asia/Shanghai', o.shipped_at)::date between p_from and p_to
    group by 1
  ), after_sales as (
    select timezone('Asia/Shanghai', ao.completed_at)::date report_date,
      coalesce(sum(r.amount), 0) refund_amount,
      coalesce(sum(case when ao.type = 'exchange' then ai.quantity * coalesce(ai.unit_cost_snapshot, 0) else 0 end), 0) exchange_cost,
      coalesce(sum(case when ai.condition = 'good' then ai.quantity * coalesce(ai.unit_cost_snapshot, 0) else 0 end), 0) return_cost
    from public.after_sales_orders ao
    join public.after_sales_items ai on ai.after_sales_order_id = ao.id
    left join public.refunds r on r.after_sales_order_id = ao.id
    where timezone('Asia/Shanghai', ao.completed_at)::date between p_from and p_to
    group by 1
  )
  select coalesce(jsonb_agg(
    case when v_is_owner then jsonb_build_object(
      'date', d.report_date, 'grossSales', coalesce(s.gross_sales, 0), 'refundAmount', coalesce(a.refund_amount, 0),
      'netSales', coalesce(s.gross_sales, 0) - coalesce(a.refund_amount, 0), 'orderCount', coalesce(s.order_count, 0),
      'netCost', coalesce(s.original_cost, 0) + coalesce(a.exchange_cost, 0) - coalesce(a.return_cost, 0),
      'grossProfit', coalesce(s.gross_sales, 0) - coalesce(a.refund_amount, 0) - coalesce(s.original_cost, 0) - coalesce(a.exchange_cost, 0) + coalesce(a.return_cost, 0)
    ) else jsonb_build_object(
      'date', d.report_date, 'grossSales', coalesce(s.gross_sales, 0), 'refundAmount', coalesce(a.refund_amount, 0),
      'netSales', coalesce(s.gross_sales, 0) - coalesce(a.refund_amount, 0), 'orderCount', coalesce(s.order_count, 0)
    ) end order by d.report_date
  ), '[]'::jsonb)
  into v_daily
  from days d left join sales s using (report_date) left join after_sales a using (report_date);

  with sold as (
    select i.product_id, max(i.product_name_snapshot) product_name, max(i.sku_snapshot) sku,
      sum(i.quantity)::integer quantity, sum(i.quantity * i.unit_price) gross_sales,
      sum(i.quantity * coalesce(i.unit_cost_snapshot, 0)) original_cost
    from public.sales_order_items i join public.sales_orders o on o.id = i.sales_order_id
    where o.status = 'completed' and timezone('Asia/Shanghai', o.shipped_at)::date between p_from and p_to
    group by i.product_id
  ), returned as (
    select ai.product_id,
      sum(case when r.id is not null then ai.quantity * ai.unit_price_snapshot else 0 end) refund_amount,
      sum(case when ao.type = 'exchange' then ai.quantity * coalesce(ai.unit_cost_snapshot, 0) else 0 end) exchange_cost,
      sum(case when ai.condition = 'good' then ai.quantity * coalesce(ai.unit_cost_snapshot, 0) else 0 end) return_cost
    from public.after_sales_items ai
    join public.after_sales_orders ao on ao.id = ai.after_sales_order_id
    left join public.refunds r on r.after_sales_order_id = ao.id
    where timezone('Asia/Shanghai', ao.completed_at)::date between p_from and p_to
    group by ai.product_id
  )
  select coalesce(jsonb_agg(
    case when v_is_owner then jsonb_build_object(
      'productId', s.product_id, 'productName', s.product_name, 'sku', s.sku, 'quantity', s.quantity,
      'grossSales', s.gross_sales, 'refundAmount', coalesce(r.refund_amount, 0), 'netSales', s.gross_sales - coalesce(r.refund_amount, 0),
      'netCost', s.original_cost + coalesce(r.exchange_cost, 0) - coalesce(r.return_cost, 0),
      'grossProfit', s.gross_sales - coalesce(r.refund_amount, 0) - s.original_cost - coalesce(r.exchange_cost, 0) + coalesce(r.return_cost, 0)
    ) else jsonb_build_object(
      'productId', s.product_id, 'productName', s.product_name, 'sku', s.sku, 'quantity', s.quantity,
      'grossSales', s.gross_sales, 'refundAmount', coalesce(r.refund_amount, 0), 'netSales', s.gross_sales - coalesce(r.refund_amount, 0)
    ) end order by s.gross_sales - coalesce(r.refund_amount, 0) desc, s.product_name
  ), '[]'::jsonb)
  into v_products
  from sold s left join returned r using (product_id);

  select jsonb_build_object(
    'totalQuantity', coalesce(sum(p.stock_qty), 0),
    'lowStockCount', count(*) filter (where p.low_stock_threshold is not null and p.stock_qty <= p.low_stock_threshold),
    'damageQuantity', coalesce((select sum(abs(ai.quantity_delta)) from public.stock_adjustment_items ai join public.stock_adjustments a on a.id = ai.stock_adjustment_id where a.type = 'damage' and timezone('Asia/Shanghai', a.created_at)::date between p_from and p_to), 0)
  ) || case when v_is_owner then jsonb_build_object('inventoryValue', coalesce(sum(p.stock_qty * p.cost_price), 0)) else '{}'::jsonb end
  into v_inventory
  from public.products p where p.status = 'active';

  select jsonb_build_object(
    'purchaseAmount', coalesce((select sum(po.total_amount) from public.purchase_orders po where po.status <> 'cancelled' and timezone('Asia/Shanghai', coalesce(po.confirmed_at, po.created_at))::date between p_from and p_to), 0),
    'receivedQuantity', coalesce((select sum(pri.quantity) from public.purchase_receipt_items pri join public.purchase_receipts pr on pr.id = pri.purchase_receipt_id where timezone('Asia/Shanghai', pr.received_at)::date between p_from and p_to), 0),
    'paidAmount', coalesce((select sum(sp.amount) from public.supplier_payments sp where timezone('Asia/Shanghai', sp.paid_at)::date between p_from and p_to), 0),
    'unpaidAmount', coalesce((select sum(po.total_amount) from public.purchase_orders po where po.status <> 'cancelled' and po.payment_status = 'unpaid'), 0)
  ) into v_purchases;

  select jsonb_build_object(
    'returnQuantity', coalesce(sum(case when ao.type = 'return' then ai.quantity else 0 end), 0),
    'exchangeQuantity', coalesce(sum(case when ao.type = 'exchange' then ai.quantity else 0 end), 0),
    'damageQuantity', coalesce(sum(case when ai.condition = 'damaged' then ai.quantity else 0 end), 0),
    'refundAmount', coalesce(sum(case when r.id is not null then ai.quantity * ai.unit_price_snapshot else 0 end), 0)
  ) into v_after_sales
  from public.after_sales_orders ao
  join public.after_sales_items ai on ai.after_sales_order_id = ao.id
  left join public.refunds r on r.after_sales_order_id = ao.id
  where timezone('Asia/Shanghai', ao.completed_at)::date between p_from and p_to;

  select coalesce(jsonb_agg(to_jsonb(s) order by s.last_sold_at nulls first, s.name), '[]'::jsonb)
  into v_slow_moving from public.list_slow_moving_products(30) s;

  return jsonb_build_object(
    'role', case when v_is_owner then 'owner' else 'staff' end,
    'from', p_from, 'to', p_to, 'summary', v_summary, 'daily', v_daily, 'products', v_products,
    'inventory', v_inventory, 'purchases', v_purchases, 'afterSales', v_after_sales, 'slowMoving', v_slow_moving
  );
end;
$$;

revoke execute on function public.get_product_by_barcode(text), public.list_slow_moving_products(integer), public.get_business_report(date,date) from public, anon;
grant execute on function public.get_product_by_barcode(text), public.list_slow_moving_products(integer), public.get_business_report(date,date) to authenticated;
