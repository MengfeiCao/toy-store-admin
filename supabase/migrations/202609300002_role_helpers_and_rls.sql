create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.users
  where id = auth.uid()
    and status = 'active'
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and status = 'active'
  )
$$;

create or replace function public.require_owner()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.current_user_role() <> 'owner' then
    raise exception 'owner role required' using errcode = '42501';
  end if;
end;
$$;

revoke all on table
  public.users,
  public.products,
  public.customers,
  public.stock_in_orders,
  public.stock_in_items,
  public.sales_orders,
  public.sales_order_items,
  public.stock_records
from anon, authenticated;

revoke all on all sequences in schema public from anon, authenticated;

grant usage on type
  public.app_role,
  public.user_status,
  public.product_status,
  public.stock_in_status,
  public.sales_order_status,
  public.payment_status,
  public.payment_method
to authenticated;

grant select (id, name, role, status, created_at) on public.users to authenticated;
grant select (
  id, sku, barcode, name, category, brand, age_range, image_path,
  sale_price, stock_qty, low_stock_threshold, status, created_at, updated_at
) on public.products to authenticated;
grant select on public.customers to authenticated;
grant select on public.stock_in_orders to authenticated;
grant select on public.stock_in_items to authenticated;
grant select on public.sales_orders to authenticated;
grant select (
  id, sales_order_id, product_id, quantity, product_name_snapshot,
  sku_snapshot, unit_price
) on public.sales_order_items to authenticated;
grant select on public.stock_records to authenticated;

alter table public.users enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.stock_in_orders enable row level security;
alter table public.stock_in_items enable row level security;
alter table public.sales_orders enable row level security;
alter table public.sales_order_items enable row level security;
alter table public.stock_records enable row level security;

create policy users_select_active
on public.users for select to authenticated
using (id = auth.uid() or public.current_user_role() = 'owner');

create policy products_select_active
on public.products for select to authenticated
using (public.is_active_user());

create policy customers_select_active
on public.customers for select to authenticated
using (public.is_active_user());

create policy stock_in_orders_select_active
on public.stock_in_orders for select to authenticated
using (public.is_active_user());

create policy stock_in_items_select_active
on public.stock_in_items for select to authenticated
using (public.is_active_user());

create policy sales_orders_select_active
on public.sales_orders for select to authenticated
using (public.is_active_user());

create policy sales_order_items_select_active
on public.sales_order_items for select to authenticated
using (public.is_active_user());

create policy stock_records_select_active
on public.stock_records for select to authenticated
using (public.is_active_user());
