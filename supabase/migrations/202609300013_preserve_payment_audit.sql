create or replace function public.mark_sales_order_paid(p_order_id uuid, p_payment_method public.payment_method)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_active_user() then raise exception 'active user required' using errcode = '42501'; end if;
  perform set_config('app.allow_stock_mutation', 'on', true);
  update public.sales_orders
  set payment_status = 'paid', payment_method = p_payment_method, paid_at = now(), paid_by = auth.uid()
  where id = p_order_id and status = 'completed' and payment_status = 'unpaid';
  if not found then
    if exists (select 1 from public.sales_orders where id = p_order_id and status = 'completed' and payment_status = 'paid') then return; end if;
    raise exception '只有已完成订单可以收款' using errcode = '22023';
  end if;
end;
$$;
