create or replace function public.list_products(
  p_query text default '',
  p_status public.product_status default null
)
returns table (
  id uuid,
  sku text,
  barcode text,
  name text,
  category text,
  brand text,
  age_range text,
  sale_price numeric,
  cost_price numeric,
  stock_qty integer,
  low_stock_threshold integer,
  image_path text,
  status public.product_status
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.sku,
    p.barcode,
    p.name,
    p.category,
    p.brand,
    p.age_range,
    p.sale_price,
    case when public.current_user_role() = 'owner' then p.cost_price else null end,
    p.stock_qty,
    p.low_stock_threshold,
    p.image_path,
    p.status
  from public.products p
  where public.is_active_user()
    and (p_status is null or p.status = p_status)
    and (
      nullif(trim(p_query), '') is null
      or p.name ilike '%' || trim(p_query) || '%'
      or p.sku ilike '%' || trim(p_query) || '%'
      or coalesce(p.barcode, '') ilike '%' || trim(p_query) || '%'
    )
  order by p.created_at desc;
$$;

create or replace function public.create_product(
  p_sku text,
  p_barcode text,
  p_name text,
  p_category text,
  p_brand text,
  p_age_range text,
  p_cost_price numeric,
  p_sale_price numeric,
  p_low_stock_threshold integer,
  p_image_path text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  product_id uuid;
begin
  perform public.require_owner();
  insert into public.products (sku, barcode, name, category, brand, age_range, cost_price, sale_price, low_stock_threshold, image_path)
  values (trim(p_sku), nullif(trim(p_barcode), ''), trim(p_name), trim(p_category), nullif(trim(p_brand), ''), nullif(trim(p_age_range), ''), p_cost_price, p_sale_price, p_low_stock_threshold, p_image_path)
  returning id into product_id;
  return product_id;
end;
$$;

create or replace function public.update_product_public(
  p_id uuid,
  p_barcode text,
  p_name text,
  p_category text,
  p_brand text,
  p_age_range text,
  p_low_stock_threshold integer,
  p_image_path text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_user() then
    raise exception 'active user required' using errcode = '42501';
  end if;
  update public.products
  set barcode = nullif(trim(p_barcode), ''),
      name = trim(p_name),
      category = trim(p_category),
      brand = nullif(trim(p_brand), ''),
      age_range = nullif(trim(p_age_range), ''),
      low_stock_threshold = p_low_stock_threshold,
      image_path = p_image_path
  where id = p_id;
  if not found then raise exception 'product not found' using errcode = 'P0002'; end if;
end;
$$;

create or replace function public.update_product_pricing(
  p_id uuid,
  p_cost_price numeric,
  p_sale_price numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_owner();
  update public.products set cost_price = p_cost_price, sale_price = p_sale_price where id = p_id;
  if not found then raise exception 'product not found' using errcode = 'P0002'; end if;
end;
$$;

create or replace function public.set_product_status(
  p_id uuid,
  p_status public.product_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_owner();
  update public.products set status = p_status where id = p_id;
  if not found then raise exception 'product not found' using errcode = 'P0002'; end if;
end;
$$;

grant execute on function public.list_products(text, public.product_status) to authenticated;
grant execute on function public.create_product(text, text, text, text, text, text, numeric, numeric, integer, text) to authenticated;
grant execute on function public.update_product_public(uuid, text, text, text, text, text, integer, text) to authenticated;
grant execute on function public.update_product_pricing(uuid, numeric, numeric) to authenticated;
grant execute on function public.set_product_status(uuid, public.product_status) to authenticated;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', false)
on conflict (id) do nothing;

create policy product_images_read_active
on storage.objects for select to authenticated
using (bucket_id = 'product-images' and public.is_active_user());

create policy product_images_upload_active
on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and public.is_active_user());

create policy product_images_delete_owner
on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and public.current_user_role() = 'owner');
