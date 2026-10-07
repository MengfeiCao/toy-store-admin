-- Run after `supabase db reset` with an authenticated owner available.
insert into public.products (sku, name, category, cost_price, sale_price, stock_qty, low_stock_threshold, status)
values ('DLJM-001', '恐龙积木', '积木', 60, 100, 0, 3, 'active')
on conflict (sku) do update set name = excluded.name, category = excluded.category, cost_price = excluded.cost_price, sale_price = excluded.sale_price, low_stock_threshold = excluded.low_stock_threshold, status = excluded.status;

insert into public.suppliers (name, contact_name, phone, status, created_by)
select '本地验收供应商', '测试联系人', '13800000000', 'active', id
from public.users
where role = 'owner' and status = 'active'
order by created_at
limit 1
on conflict (name) do update set contact_name = excluded.contact_name, phone = excluded.phone, status = excluded.status;
