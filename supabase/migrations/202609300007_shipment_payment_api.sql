create or replace function public.ship_sales_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.sales_orders%rowtype;
  v_item public.sales_order_items%rowtype;
  v_stock integer;
  v_cost numeric(12, 2);
begin
  if not public.is_active_user() then raise exception 'active user required' using errcode = '42501'; end if;
  select * into v_order from public.sales_orders where id = p_order_id for update;
  if not found then raise exception 'sales order not found' using errcode = 'P0002'; end if;
  if v_order.status = 'completed' then return; end if;
  if v_order.status <> 'pending_shipment' then raise exception 'sales order is not ready for shipment' using errcode = '22023'; end if;

  perform set_config('app.allow_stock_mutation', 'on', true);
  for v_item in select * from public.sales_order_items where sales_order_id = p_order_id order by product_id for update
  loop
    select stock_qty, cost_price into v_stock, v_cost from public.products where id = v_item.product_id for update;
    if not found or v_stock < v_item.quantity then
      raise exception '库存不足，无法完成整单出库' using errcode = '22003';
    end if;
    update public.products set stock_qty = stock_qty - v_item.quantity where id = v_item.product_id;
    update public.sales_order_items set unit_cost_snapshot = v_cost where id = v_item.id;
    insert into public.stock_records (product_id, quantity_delta, sales_order_item_id, created_by)
    values (v_item.product_id, -v_item.quantity, v_item.id, auth.uid());
  end loop;
  update public.sales_orders set status = 'completed', shipped_by = auth.uid(), shipped_at = now() where id = p_order_id;
end;
$$;

create or replace function public.mark_sales_order_paid(p_order_id uuid, p_payment_method public.payment_method)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_user() then raise exception 'active user required' using errcode = '42501'; end if;
  update public.sales_orders
  set payment_status = 'paid', payment_method = p_payment_method, paid_at = now(), paid_by = auth.uid(), payment_reverted_at = null, payment_reverted_by = null
  where id = p_order_id and status = 'completed' and payment_status = 'unpaid';
  if not found then
    if exists (select 1 from public.sales_orders where id = p_order_id and status = 'completed' and payment_status = 'paid') then return; end if;
    raise exception '只有已完成订单可以收款' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.revert_sales_order_payment(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() <> 'owner' then raise exception 'owner role required' using errcode = '42501'; end if;
  update public.sales_orders
  set payment_status = 'unpaid', payment_method = null, paid_at = null, paid_by = null, payment_reverted_at = now(), payment_reverted_by = auth.uid()
  where id = p_order_id and status = 'completed' and payment_status = 'paid';
  if not found then raise exception 'paid completed order not found' using errcode = 'P0002'; end if;
end;
$$;

grant execute on function public.ship_sales_order(uuid) to authenticated;
grant execute on function public.mark_sales_order_paid(uuid, public.payment_method) to authenticated;
grant execute on function public.revert_sales_order_payment(uuid) to authenticated;
