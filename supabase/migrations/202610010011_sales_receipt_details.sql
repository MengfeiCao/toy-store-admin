alter function public.get_sales_order(uuid) rename to get_sales_order_base_202610010007;
revoke execute on function public.get_sales_order_base_202610010007(uuid) from public, anon, authenticated;

create function public.get_sales_order(p_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select public.get_sales_order_base_202610010007(p_order_id) || jsonb_build_object(
    'createdAt', o.created_at,
    'shippedAt', o.shipped_at,
    'paidAt', o.paid_at
  )
  from public.sales_orders o
  where o.id = p_order_id and public.is_active_user();
$$;

revoke execute on function public.get_sales_order(uuid) from public, anon;
grant execute on function public.get_sales_order(uuid) to authenticated;
