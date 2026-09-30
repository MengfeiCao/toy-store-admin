begin;
select plan(22);

select has_table('public', 'after_sales_orders', '售后单表存在');
select has_table('public', 'after_sales_items', '售后明细表存在');
select has_table('public', 'refunds', '退款表存在');
select ok(to_regprocedure('public.post_after_sales(uuid,uuid,public.after_sales_type,text,jsonb)') is not null, '售后原子函数存在');

insert into auth.users (id, email) values ('14000000-0000-0000-0000-000000000001', 'after-sales@test.local');
insert into public.users (id, name, role, status) values ('14000000-0000-0000-0000-000000000001', '售后店员', 'staff', 'active');
do $$ begin perform set_config('request.jwt.claim.sub', '14000000-0000-0000-0000-000000000001', true); end $$;

insert into public.products (id, sku, name, category, cost_price, sale_price, stock_qty) values
('34000000-0000-0000-0000-000000000001', 'AS-1', '售后玩具', '测试', 10, 20, 5);
insert into public.sales_orders (id, order_no, status, total_amount, payment_status, payment_method, created_by, confirmed_by, confirmed_at, shipped_by, shipped_at, paid_by, paid_at)
values ('44000000-0000-0000-0000-000000000001', 'XS-AS-PAID', 'completed', 100, 'paid', 'cash', '14000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', now(), '14000000-0000-0000-0000-000000000001', now(), '14000000-0000-0000-0000-000000000001', now());
insert into public.sales_order_items (id, sales_order_id, product_id, quantity, product_name_snapshot, sku_snapshot, unit_price, unit_cost_snapshot)
values ('54000000-0000-0000-0000-000000000001', '44000000-0000-0000-0000-000000000001', '34000000-0000-0000-0000-000000000001', 5, '售后玩具', 'AS-1', 20, 10);

select lives_ok($$select public.post_after_sales('64000000-0000-4000-8000-000000000001','44000000-0000-0000-0000-000000000001','return','完好退货','[{"salesOrderItemId":"54000000-0000-0000-0000-000000000001","quantity":2,"condition":"good"}]')$$, '完好部分退货成功');
select is((select stock_qty from public.products where id='34000000-0000-0000-0000-000000000001'), 7, '完好退货恢复库存');
select is((select amount from public.refunds where after_sales_order_id='64000000-0000-4000-8000-000000000001'), 40.00::numeric, '已付款订单按原售价退款');
select lives_ok($$select public.post_after_sales('64000000-0000-4000-8000-000000000001','44000000-0000-0000-0000-000000000001','return','完好退货','[{"salesOrderItemId":"54000000-0000-0000-0000-000000000001","quantity":2,"condition":"good"}]')$$, '相同请求可重放');
select is((select stock_qty from public.products where id='34000000-0000-0000-0000-000000000001'), 7, '重放不重复回库');

select lives_ok($$select public.post_after_sales('64000000-0000-4000-8000-000000000002','44000000-0000-0000-0000-000000000001','return','损坏退货','[{"salesOrderItemId":"54000000-0000-0000-0000-000000000001","quantity":1,"condition":"damaged"}]')$$, '损坏退货成功');
select is((select stock_qty from public.products where id='34000000-0000-0000-0000-000000000001'), 7, '损坏退货不进入可售库存');
select throws_ok($$select public.post_after_sales('64000000-0000-4000-8000-000000000003','44000000-0000-0000-0000-000000000001','return','超量','[{"salesOrderItemId":"54000000-0000-0000-0000-000000000001","quantity":3,"condition":"good"}]')$$, 'P0001', 'AFTER_SALES_QUANTITY_EXCEEDED', '累计退换不能超出原数量');

select lives_ok($$select public.post_after_sales('64000000-0000-4000-8000-000000000004','44000000-0000-0000-0000-000000000001','exchange','完好换货','[{"salesOrderItemId":"54000000-0000-0000-0000-000000000001","quantity":1,"condition":"good"}]')$$, '完好同款换货成功');
select is((select stock_qty from public.products where id='34000000-0000-0000-0000-000000000001'), 7, '完好同款换货库存净变化为零');
select is((select count(*)::integer from public.stock_records where after_sales_item_id is not null and after_sales_action='exchange_out'), 1, '换货生成再次出库流水');
select is((select count(*)::integer from public.refunds where after_sales_order_id='64000000-0000-4000-8000-000000000004'), 0, '换货不退款');

select set_config('app.allow_stock_mutation', 'on', true);
update public.products set stock_qty=0 where id='34000000-0000-0000-0000-000000000001';
select throws_ok($$select public.post_after_sales('64000000-0000-4000-8000-000000000005','44000000-0000-0000-0000-000000000001','exchange','损坏换货','[{"salesOrderItemId":"54000000-0000-0000-0000-000000000001","quantity":1,"condition":"damaged"}]')$$, 'P0001', 'INSUFFICIENT_STOCK', '损坏换货库存不足整单失败');
select is((select count(*)::integer from public.after_sales_orders where id='64000000-0000-4000-8000-000000000005'), 0, '换货失败不保留售后单');

insert into public.sales_orders (id, order_no, status, total_amount, payment_status, created_by, confirmed_by, confirmed_at, shipped_by, shipped_at)
values ('44000000-0000-0000-0000-000000000002', 'XS-AS-UNPAID', 'completed', 40, 'unpaid', '14000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', now(), '14000000-0000-0000-0000-000000000001', now());
insert into public.sales_order_items (id, sales_order_id, product_id, quantity, product_name_snapshot, sku_snapshot, unit_price, unit_cost_snapshot)
values ('54000000-0000-0000-0000-000000000002', '44000000-0000-0000-0000-000000000002', '34000000-0000-0000-0000-000000000001', 2, '售后玩具', 'AS-1', 20, 10);
select lives_ok($$select public.post_after_sales('64000000-0000-4000-8000-000000000006','44000000-0000-0000-0000-000000000002','return','未付款退货','[{"salesOrderItemId":"54000000-0000-0000-0000-000000000002","quantity":1,"condition":"damaged"}]')$$, '未付款订单退货成功');
select is((select count(*)::integer from public.refunds where sales_order_id='44000000-0000-0000-0000-000000000002'), 0, '未付款订单不生成退款');
select is((public.get_sales_order('44000000-0000-0000-0000-000000000002')->>'netAmount')::numeric, 20.00::numeric, '未付款订单按退货后净额收款');
select is((public.get_sales_order('44000000-0000-0000-0000-000000000001')->>'refundedAmount')::numeric, 60.00::numeric, '销售详情返回累计退款');

select * from finish();
rollback;
