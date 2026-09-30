-- Run after `supabase db reset` with an authenticated owner available.
insert into public.products (sku, name, category, cost_price, sale_price, stock_qty, low_stock_threshold, status)
values ('DLJM-001', '恐龙积木', '积木', 60, 100, 0, 3, 'active')
on conflict (sku) do update set name = excluded.name, category = excluded.category, cost_price = excluded.cost_price, sale_price = excluded.sale_price, low_stock_threshold = excluded.low_stock_threshold, status = excluded.status;
