begin;

select plan(8);

select ok(to_regprocedure('public.get_dashboard(date,date)') is not null, 'get_dashboard 函数存在');
select ok(to_regprocedure('public.list_low_stock_products()') is not null, 'list_low_stock_products 函数存在');
select is((select prosecdef from pg_proc where oid = 'public.get_dashboard(date,date)'::regprocedure), true, '经营统计使用 security definer');
select is((select prosecdef from pg_proc where oid = 'public.list_low_stock_products()'::regprocedure), true, '低库存查询使用 security definer');
select ok((select pg_get_functiondef('public.get_dashboard(date,date)'::regprocedure) not like '%cost_price%'), '统计使用成本快照，不读取商品当前成本');
select is((select relrowsecurity from pg_class where oid = 'public.products'::regclass), true, '商品表保留 RLS');
select is((select relrowsecurity from pg_class where oid = 'public.sales_orders'::regclass), true, '订单表保留 RLS');
select ok((select pg_get_functiondef('public.list_low_stock_products()'::regprocedure) like '%stock_qty <= p.low_stock_threshold%'), '低库存按阈值判断');

select * from finish();
rollback;
