create extension if not exists pgcrypto;

do $$
begin
  create type public.app_role as enum ('owner', 'staff');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.user_status as enum ('active', 'disabled');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.product_status as enum ('active', 'inactive');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.stock_in_status as enum ('draft', 'posted');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.sales_order_status as enum ('draft', 'pending_shipment', 'completed', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_status as enum ('unpaid', 'paid');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_method as enum ('wechat', 'alipay', 'cash', 'other');
exception when duplicate_object then null;
end $$;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  role public.app_role not null default 'staff',
  status public.user_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique check (char_length(trim(sku)) > 0),
  barcode text,
  name text not null check (char_length(trim(name)) > 0),
  category text not null check (char_length(trim(category)) > 0),
  brand text,
  age_range text,
  image_path text,
  cost_price numeric(12, 2) not null check (cost_price >= 0),
  sale_price numeric(12, 2) not null check (sale_price >= 0),
  stock_qty integer not null default 0 check (stock_qty >= 0),
  low_stock_threshold integer check (low_stock_threshold is null or low_stock_threshold >= 0),
  status public.product_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index products_barcode_key on public.products (barcode) where barcode is not null;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  phone text,
  address text,
  remark text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stock_in_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  status public.stock_in_status not null default 'draft',
  remark text,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  posted_by uuid references public.users(id),
  posted_at timestamptz
);

create table public.stock_in_items (
  id uuid primary key default gen_random_uuid(),
  stock_in_order_id uuid not null references public.stock_in_orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  unique (stock_in_order_id, product_id)
);

create table public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  customer_id uuid references public.customers(id),
  status public.sales_order_status not null default 'draft',
  total_amount numeric(12, 2) not null default 0 check (total_amount >= 0),
  remark text,
  payment_status public.payment_status not null default 'unpaid',
  payment_method public.payment_method,
  paid_at timestamptz,
  paid_by uuid references public.users(id),
  payment_reverted_at timestamptz,
  payment_reverted_by uuid references public.users(id),
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  confirmed_by uuid references public.users(id),
  confirmed_at timestamptz,
  shipped_by uuid references public.users(id),
  shipped_at timestamptz,
  check (payment_status = 'unpaid' or (payment_method is not null and paid_at is not null and paid_by is not null)),
  check (status <> 'completed' or shipped_at is not null)
);

create table public.sales_order_items (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references public.sales_orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  product_name_snapshot text not null,
  sku_snapshot text not null,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  unit_cost_snapshot numeric(12, 2) check (unit_cost_snapshot is null or unit_cost_snapshot >= 0),
  unique (sales_order_id, product_id)
);

create table public.stock_records (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  quantity_delta integer not null check (quantity_delta <> 0),
  stock_in_item_id uuid references public.stock_in_items(id),
  sales_order_item_id uuid references public.sales_order_items(id),
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  check ((stock_in_item_id is not null)::integer + (sales_order_item_id is not null)::integer = 1)
);

create unique index stock_records_stock_in_item_unique
  on public.stock_records (stock_in_item_id)
  where stock_in_item_id is not null;

create unique index stock_records_sales_order_item_unique
  on public.stock_records (sales_order_item_id)
  where sales_order_item_id is not null;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_touch_updated_at
before update on public.products
for each row execute function public.touch_updated_at();

create trigger customers_touch_updated_at
before update on public.customers
for each row execute function public.touch_updated_at();

create or replace function public.protect_product_stock()
returns trigger
language plpgsql
as $$
begin
  if new.stock_qty <> old.stock_qty and coalesce(current_setting('app.allow_stock_mutation', true), 'off') <> 'on' then
    raise exception 'products.stock_qty must be changed by a stock transaction';
  end if;
  return new;
end;
$$;

create trigger products_stock_protection
before update on public.products
for each row execute function public.protect_product_stock();

create or replace function public.protect_posted_stock_in()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'posted' and coalesce(current_setting('app.allow_stock_mutation', true), 'off') <> 'on' then
    raise exception 'posted stock-in orders are immutable';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger stock_in_orders_posted_protection
before update or delete on public.stock_in_orders
for each row execute function public.protect_posted_stock_in();

create or replace function public.protect_confirmed_sales_order()
returns trigger
language plpgsql
as $$
begin
  if old.status <> 'draft' and coalesce(current_setting('app.allow_stock_mutation', true), 'off') <> 'on' then
    raise exception 'confirmed sales orders are immutable';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger sales_orders_confirmed_protection
before update or delete on public.sales_orders
for each row execute function public.protect_confirmed_sales_order();

create or replace function public.protect_confirmed_sales_order_items()
returns trigger
language plpgsql
as $$
declare
  order_status public.sales_order_status;
begin
  select status into order_status from public.sales_orders where id = coalesce(new.sales_order_id, old.sales_order_id);
  if order_status <> 'draft' and coalesce(current_setting('app.allow_stock_mutation', true), 'off') <> 'on' then
    raise exception 'items of confirmed sales orders are immutable';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger sales_order_items_confirmed_protection
before update or delete on public.sales_order_items
for each row execute function public.protect_confirmed_sales_order_items();

create or replace function public.protect_stock_records()
returns trigger
language plpgsql
as $$
begin
  raise exception 'stock records are immutable';
end;
$$;

create trigger stock_records_immutable
before update or delete on public.stock_records
for each row execute function public.protect_stock_records();
