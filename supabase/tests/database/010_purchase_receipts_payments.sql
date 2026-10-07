begin;

select plan(30);

select has_table('public', 'purchase_receipts', '采购到货表存在');
select has_table('public', 'purchase_receipt_items', '采购到货明细表存在');
select has_table('public', 'supplier_payments', '供应商付款表存在');
select has_column('public', 'stock_records', 'purchase_receipt_item_id', '库存流水关联采购到货明细');
select ok(to_regprocedure('public.post_purchase_receipt(uuid,uuid,text,jsonb)') is not null, '采购到货函数存在');
select ok(to_regprocedure('public.mark_purchase_order_paid(uuid,uuid)') is not null, '采购付款函数存在');
select ok(to_regprocedure('public.list_purchase_receipts(text,uuid,uuid,date)') is not null, '到货列表函数存在');
select ok(to_regprocedure('public.get_purchase_receipt(uuid)') is not null, '到货详情函数存在');
select ok(to_regprocedure('public.get_supplier_payment(uuid)') is not null, '付款详情函数存在');
select ok(lower(pg_get_functiondef('public.post_purchase_receipt(uuid,uuid,text,jsonb)'::regprocedure)) like '%for update%', '到货事务使用行锁防止并发超收');

insert into auth.users (id, email) values ('11000000-0000-0000-0000-000000000001', 'receipt-owner@test.local');
insert into public.users (id, name, role, status) values ('11000000-0000-0000-0000-000000000001', '到货店主', 'owner', 'active');
do $$ begin perform set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000001', true); end $$;
insert into public.suppliers (id, name, created_by) values ('21000000-0000-0000-0000-000000000001', '到货测试供应商', '11000000-0000-0000-0000-000000000001');
insert into public.products (id, sku, name, category, cost_price, sale_price) values ('31000000-0000-0000-0000-000000000001', 'RECEIPT-1', '到货测试玩具', '测试', 6, 20);

do $$
declare v_order_id uuid;
begin
  v_order_id := public.save_purchase_order_draft(null, '21000000-0000-0000-0000-000000000001', '到货测试采购', '[{"productId":"31000000-0000-0000-0000-000000000001","quantity":10,"unitCost":8}]'::jsonb);
  perform public.confirm_purchase_order(v_order_id);
end $$;

select lives_ok(format('select public.post_purchase_receipt(%L, %L, %L, %L::jsonb)', '41000000-0000-0000-0000-000000000001', (select id from public.purchase_orders where remark = '到货测试采购'), '首批4件', format('[{"purchaseOrderItemId":"%s","quantity":4}]', (select id from public.purchase_order_items limit 1))), '首批到货4件成功');
select is((select status from public.purchase_orders where remark = '到货测试采购'), 'partially_received'::public.purchase_order_status, '部分到货状态正确');
select is((select received_quantity from public.purchase_order_items limit 1), 4, '累计到货数量为4');
select is((select stock_qty from public.products where id = '31000000-0000-0000-0000-000000000001'), 4, '首批库存增加4');
select is((select cost_price from public.products where id = '31000000-0000-0000-0000-000000000001'), 8.00::numeric, '到货后更新当前成本');
select is((select quantity_delta from public.stock_records where purchase_receipt_item_id is not null limit 1), 4, '生成正向库存流水');

select lives_ok(format('select public.post_purchase_receipt(%L, %L, %L, %L::jsonb)', '41000000-0000-0000-0000-000000000001', (select id from public.purchase_orders where remark = '到货测试采购'), '首批4件', format('[{"purchaseOrderItemId":"%s","quantity":4}]', (select id from public.purchase_order_items limit 1))), '相同请求可安全重放');
select is((select count(*)::integer from public.purchase_receipts), 1, '重放不新增到货单');
select is((select stock_qty from public.products where id = '31000000-0000-0000-0000-000000000001'), 4, '重放不重复增加库存');
select throws_ok(format('select public.post_purchase_receipt(%L, %L, %L, %L::jsonb)', '41000000-0000-0000-0000-000000000001', (select id from public.purchase_orders where remark = '到货测试采购'), '不同内容', format('[{"purchaseOrderItemId":"%s","quantity":4}]', (select id from public.purchase_order_items limit 1))), 'P0001', 'REQUEST_ID_CONFLICT', '相同请求标识不同内容被拒绝');
select throws_ok(format('select public.post_purchase_receipt(%L, %L, null, %L::jsonb)', '41000000-0000-0000-0000-000000000002', (select id from public.purchase_orders where remark = '到货测试采购'), format('[{"purchaseOrderItemId":"%s","quantity":7}]', (select id from public.purchase_order_items limit 1))), 'P0001', 'OVER_RECEIPT', '超额到货整单拒绝');
select is((select stock_qty from public.products where id = '31000000-0000-0000-0000-000000000001'), 4, '超额到货不改变库存');

select lives_ok(format('select public.post_purchase_receipt(%L, %L, null, %L::jsonb)', '41000000-0000-0000-0000-000000000003', (select id from public.purchase_orders where remark = '到货测试采购'), format('[{"purchaseOrderItemId":"%s","quantity":6}]', (select id from public.purchase_order_items limit 1))), '第二批到货6件成功');
select is((select status from public.purchase_orders where remark = '到货测试采购'), 'completed'::public.purchase_order_status, '全部到货后采购完成');
select is((select stock_qty from public.products where id = '31000000-0000-0000-0000-000000000001'), 10, '两批到货库存合计10');

select lives_ok(format('select public.mark_purchase_order_paid(%L, %L)', '51000000-0000-0000-0000-000000000001', (select id from public.purchase_orders where remark = '到货测试采购')), '采购单一次性付款成功');
select is((select payment_status from public.purchase_orders where remark = '到货测试采购'), 'paid'::public.payment_status, '采购单变为已付款');
select lives_ok(format('select public.mark_purchase_order_paid(%L, %L)', '51000000-0000-0000-0000-000000000001', (select id from public.purchase_orders where remark = '到货测试采购')), '相同付款请求可安全重放');
select is((select count(*)::integer from public.supplier_payments), 1, '付款重放不新增记录');
select throws_ok(format('select public.mark_purchase_order_paid(%L, %L)', '51000000-0000-0000-0000-000000000002', (select id from public.purchase_orders where remark = '到货测试采购')), 'P0001', 'PURCHASE_ALREADY_PAID', '不同请求不能重复付款');

select * from finish();
rollback;
