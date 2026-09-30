drop policy if exists products_select_active on public.products;
create policy products_select_active
on public.products for select to authenticated
using (public.is_active_user() and (public.current_user_role() = 'owner' or status = 'active'));

create or replace function public.list_products(
  p_query text default '',
  p_status public.product_status default null
)
returns table (
  id uuid, sku text, barcode text, name text, category text, brand text,
  age_range text, sale_price numeric, cost_price numeric, stock_qty integer,
  low_stock_threshold integer, image_path text, status public.product_status
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.sku, p.barcode, p.name, p.category, p.brand, p.age_range, p.sale_price,
    case when public.current_user_role() = 'owner' then p.cost_price else null end,
    p.stock_qty, p.low_stock_threshold, p.image_path, p.status
  from public.products p
  where public.is_active_user()
    and (public.current_user_role() = 'owner' or p.status = 'active')
    and (p_status is null or p.status = p_status)
    and (
      nullif(trim(p_query), '') is null
      or p.name ilike '%' || trim(p_query) || '%'
      or p.sku ilike '%' || trim(p_query) || '%'
      or coalesce(p.barcode, '') ilike '%' || trim(p_query) || '%'
    )
  order by p.created_at desc;
$$;
