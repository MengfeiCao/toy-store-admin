begin;
select plan(16);

select ok(to_regprocedure('public.get_business_report(date,date)') is not null, '统一经营报表函数存在');
select ok(to_regprocedure('public.get_product_by_barcode(text)') is not null, '条码精确查询函数存在');
select ok(to_regprocedure('public.list_slow_moving_products(integer)') is not null, '滞销商品函数存在');

insert into auth.users (id,email) values ('15000000-0000-0000-0000-000000000001','report-owner@test.local');
insert into public.users(id,name,role,status) values ('15000000-0000-0000-0000-000000000001','报表店主','owner','active');
do $$ begin perform set_config('request.jwt.claim.sub','15000000-0000-0000-0000-000000000001',true); end $$;
insert into public.products(id,sku,barcode,name,category,cost_price,sale_price,stock_qty,low_stock_threshold,created_at) values
('35000000-0000-0000-0000-000000000001','REP-1','690000000001','报表玩具','测试',20,50,4,5,'2026-08-01'),
('35000000-0000-0000-0000-000000000002','SLOW-1','690000000002','滞销玩具','测试',10,30,3,1,'2026-08-01');
insert into public.sales_orders(id,order_no,status,total_amount,payment_status,payment_method,paid_at,paid_by,created_by,confirmed_by,confirmed_at,shipped_by,shipped_at) values
('45000000-0000-0000-0000-000000000001','XS-REPORT','completed',100,'paid','cash','2026-09-30 16:25+00','15000000-0000-0000-0000-000000000001','15000000-0000-0000-0000-000000000001','15000000-0000-0000-0000-000000000001','2026-09-30 16:20+00','15000000-0000-0000-0000-000000000001','2026-09-30 16:30+00');
insert into public.sales_order_items(id,sales_order_id,product_id,quantity,product_name_snapshot,sku_snapshot,unit_price,unit_cost_snapshot) values
('55000000-0000-0000-0000-000000000001','45000000-0000-0000-0000-000000000001','35000000-0000-0000-0000-000000000001',2,'报表玩具','REP-1',50,20);
insert into public.after_sales_orders(id,after_sales_no,sales_order_id,type,remark,created_by,completed_at,request_payload) values
('65000000-0000-4000-8000-000000000001','SH-REPORT','45000000-0000-0000-0000-000000000001','return','跨日退款','15000000-0000-0000-0000-000000000001','2026-10-01 02:00+00','{}');
insert into public.after_sales_items(after_sales_order_id,sales_order_item_id,product_id,quantity,condition,product_name_snapshot,sku_snapshot,unit_price_snapshot,unit_cost_snapshot) values
('65000000-0000-4000-8000-000000000001','55000000-0000-0000-0000-000000000001','35000000-0000-0000-0000-000000000001',1,'good','报表玩具','REP-1',50,20);
insert into public.refunds(after_sales_order_id,sales_order_id,amount,refunded_by,refunded_at) values
('65000000-0000-4000-8000-000000000001','45000000-0000-0000-0000-000000000001',50,'15000000-0000-0000-0000-000000000001','2026-10-01 02:00+00');

select is((public.get_business_report('2026-10-01','2026-10-01')->'summary'->>'grossSales')::numeric,100.00::numeric,'销售额按门店日期统计');
select is((public.get_business_report('2026-10-01','2026-10-01')->'summary'->>'refundAmount')::numeric,50.00::numeric,'退款按售后完成日期统计');
select is((public.get_business_report('2026-10-01','2026-10-01')->'summary'->>'netSales')::numeric,50.00::numeric,'净销售额正确');
select is((public.get_business_report('2026-10-01','2026-10-01')->'summary'->>'netCost')::numeric,20.00::numeric,'完好退货冲减销售成本');
select is((public.get_business_report('2026-10-01','2026-10-01')->'summary'->>'grossProfit')::numeric,30.00::numeric,'净毛利润正确');
select is(jsonb_array_length(public.get_business_report('2026-10-01','2026-10-01')->'daily'),1,'日报趋势使用同一统计结果');
select is((public.get_business_report('2026-10-01','2026-10-01')->'afterSales'->>'returnQuantity')::integer,1,'售后分析退货数量正确');
select is((select count(*)::integer from public.list_slow_moving_products(30) where sku='SLOW-1'),1,'30天无销售且有库存为滞销');
select is((select name from public.get_product_by_barcode('690000000001')),'报表玩具','条码精确命中启用商品');
select is((select count(*)::integer from public.get_product_by_barcode('690000000009')),0,'未知条码无结果');

update public.users set role='staff' where id='15000000-0000-0000-0000-000000000001';
select ok(not (public.get_business_report('2026-10-01','2026-10-01')->'summary' ? 'netCost'),'店员报表不返回成本');
select ok(not (public.get_business_report('2026-10-01','2026-10-01')->'summary' ? 'grossProfit'),'店员报表不返回毛利润');
select ok(not ((public.get_business_report('2026-10-01','2026-10-01')->'products'->0) ? 'grossProfit'),'店员商品排行不返回毛利润');

select * from finish();
rollback;
