begin;

select plan(10);

select ok(to_regprocedure('public.save_sales_order(uuid,uuid,text,jsonb,boolean)') is not null, 'save_sales_order 函数存在');
select ok(to_regprocedure('public.get_sales_order(uuid)') is not null, 'get_sales_order 函数存在');
select ok(to_regprocedure('public.list_sales_orders(text,text,text,date)') is not null, 'list_sales_orders 函数存在');
select ok(to_regprocedure('public.cancel_sales_order(uuid)') is not null, 'cancel_sales_order 函数存在');
select is((select prosecdef from pg_proc where oid = 'public.save_sales_order(uuid,uuid,text,jsonb,boolean)'::regprocedure), true, '保存订单使用 security definer');
select is((select prosecdef from pg_proc where oid = 'public.get_sales_order(uuid)'::regprocedure), true, '订单详情使用 security definer');
select is((select relrowsecurity from pg_class where oid = 'public.sales_orders'::regclass), true, '销售订单保留 RLS');
select is((select relrowsecurity from pg_class where oid = 'public.sales_order_items'::regclass), true, '销售明细保留 RLS');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.sales_order_items'::regclass and contype = 'u'), '销售明细同订单商品唯一约束存在');
select ok(exists (select 1 from pg_trigger where tgname = 'sales_orders_confirmed_protection'), '已确认订单保护触发器存在');

select * from finish();
rollback;
