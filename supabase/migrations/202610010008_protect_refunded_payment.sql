create or replace function public.revert_sales_order_payment(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() <> 'owner' then raise exception 'owner role required' using errcode = '42501'; end if;
  if exists(select 1 from public.refunds where sales_order_id=p_order_id) then raise exception 'REFUNDED_ORDER_PAYMENT_IMMUTABLE'; end if;
  perform set_config('app.allow_stock_mutation', 'on', true);
  update public.sales_orders
  set payment_status = 'unpaid', payment_method = null, paid_at = null, paid_by = null, payment_reverted_at = now(), payment_reverted_by = auth.uid()
  where id = p_order_id and status = 'completed' and payment_status = 'paid';
  if not found then raise exception 'paid completed order not found' using errcode = 'P0002'; end if;
end;
$$;
