begin;

select plan(10);

select ok(to_regprocedure('public.ship_sales_order(uuid)') is not null, 'ship_sales_order 函数存在');
select ok(to_regprocedure('public.mark_sales_order_paid(uuid,public.payment_method)') is not null, 'mark_sales_order_paid 函数存在');
select ok(to_regprocedure('public.revert_sales_order_payment(uuid)') is not null, 'revert_sales_order_payment 函数存在');
select is((select prosecdef from pg_proc where oid = 'public.ship_sales_order(uuid)'::regprocedure), true, '出库使用 security definer');
select is((select prosecdef from pg_proc where oid = 'public.mark_sales_order_paid(uuid,public.payment_method)'::regprocedure), true, '收款使用 security definer');
select is((select prosecdef from pg_proc where oid = 'public.revert_sales_order_payment(uuid)'::regprocedure), true, '撤销收款使用 security definer');
select ok(exists (select 1 from pg_index where indexrelid = 'public.stock_records_sales_order_item_unique'::regclass), '销售出库流水唯一索引存在');
select is((select relrowsecurity from pg_class where oid = 'public.sales_orders'::regclass), true, '订单表保留 RLS');
select is((select relrowsecurity from pg_class where oid = 'public.stock_records'::regclass), true, '库存流水表保留 RLS');
select ok(exists (select 1 from pg_trigger where tgname = 'products_stock_protection'), '库存保护触发器存在');

select * from finish();
rollback;
