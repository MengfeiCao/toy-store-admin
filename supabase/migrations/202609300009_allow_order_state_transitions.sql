create or replace function public.cancel_sales_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_user() then raise exception 'active user required' using errcode = '42501'; end if;
  perform set_config('app.allow_stock_mutation', 'on', true);
  update public.sales_orders
  set status = 'cancelled'
  where id = p_order_id and (created_by = auth.uid() or public.current_user_role() = 'owner') and status in ('draft', 'pending_shipment');
  if not found then raise exception 'sales order cannot be cancelled' using errcode = 'P0002'; end if;
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
  perform set_config('app.allow_stock_mutation', 'on', true);
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
  perform set_config('app.allow_stock_mutation', 'on', true);
  update public.sales_orders
  set payment_status = 'unpaid', payment_method = null, paid_at = null, paid_by = null, payment_reverted_at = now(), payment_reverted_by = auth.uid()
  where id = p_order_id and status = 'completed' and payment_status = 'paid';
  if not found then raise exception 'paid completed order not found' using errcode = 'P0002'; end if;
end;
$$;
