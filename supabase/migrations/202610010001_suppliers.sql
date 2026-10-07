do $$
begin
  create type public.supplier_status as enum ('active', 'inactive');
exception when duplicate_object then null;
end $$;

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  contact_name text,
  phone text,
  address text,
  remark text,
  status public.supplier_status not null default 'active',
  created_by uuid not null default auth.uid() references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger suppliers_touch_updated_at
before update on public.suppliers
for each row execute function public.touch_updated_at();

revoke all on public.suppliers from anon, authenticated;
grant usage on type public.supplier_status to authenticated;
grant select on public.suppliers to authenticated;
grant insert (name, contact_name, phone, address, remark) on public.suppliers to authenticated;
grant update (name, contact_name, phone, address, remark, status) on public.suppliers to authenticated;

alter table public.suppliers enable row level security;

create policy suppliers_select_active_user
on public.suppliers for select to authenticated
using (public.is_active_user());

create policy suppliers_insert_active_user
on public.suppliers for insert to authenticated
with check (public.is_active_user() and created_by = auth.uid());

create policy suppliers_update_active_user
on public.suppliers for update to authenticated
using (public.is_active_user())
with check (public.is_active_user());
