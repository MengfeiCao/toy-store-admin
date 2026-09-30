grant insert (name, phone, address, remark) on public.customers to authenticated;
grant update (name, phone, address, remark) on public.customers to authenticated;
grant delete on public.customers to authenticated;

create policy customers_insert_active
on public.customers for insert to authenticated
with check (public.is_active_user());

create policy customers_update_active
on public.customers for update to authenticated
using (public.is_active_user())
with check (public.is_active_user());

create policy customers_delete_active
on public.customers for delete to authenticated
using (public.is_active_user());
