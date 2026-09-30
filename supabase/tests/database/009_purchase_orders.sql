begin;

select plan(23);

select has_type('public', 'purchase_order_status', '采购单状态枚举存在');
select enum_has_labels('public', 'purchase_order_status', array['draft', 'confirmed', 'partially_received', 'completed', 'cancelled'], '采购单状态值正确');
select has_table('public', 'purchase_orders', '采购单表存在');
select has_table('public', 'purchase_order_items', '采购单明细表存在');
select ok(to_regprocedure('public.save_purchase_order_draft(uuid,uuid,text,jsonb)') is not null, '保存采购草稿函数存在');
select ok(to_regprocedure('public.confirm_purchase_order(uuid)') is not null, '确认采购单函数存在');
select ok(to_regprocedure('public.cancel_purchase_order(uuid)') is not null, '取消采购单函数存在');
select ok(to_regprocedure('public.get_purchase_order(uuid)') is not null, '采购详情函数存在');
select ok(to_regprocedure('public.list_purchase_orders(text,uuid,public.purchase_order_status,public.payment_status,date)') is not null, '采购列表函数存在');

insert into auth.users (id, email) values ('10000000-0000-0000-0000-000000000001', 'purchase-owner@test.local');
insert into public.users (id, name, role, status) values ('10000000-0000-0000-0000-000000000001', '采购店主', 'owner', 'active');
do $$ begin perform set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true); end $$;

insert into public.suppliers (id, name, created_by) values ('20000000-0000-0000-0000-000000000001', '童趣贸易', '10000000-0000-0000-0000-000000000001');
insert into public.suppliers (id, name, status, created_by) values ('20000000-0000-0000-0000-000000000002', '停用供应商', 'inactive', '10000000-0000-0000-0000-000000000001');
insert into public.products (id, sku, name, category, cost_price, sale_price) values ('30000000-0000-0000-0000-000000000001', 'CG-TEST-1', '采购测试玩具', '测试', 6, 20);

select lives_ok($$select public.save_purchase_order_draft(null, '20000000-0000-0000-0000-000000000001', '首批采购', '[{"productId":"30000000-0000-0000-0000-000000000001","quantity":2,"unitCost":12.5}]'::jsonb)$$, '活跃用户可保存采购草稿');
select is((select total_amount from public.purchase_orders where remark = '首批采购'), 25.00::numeric, '总金额由服务端计算');
select is((select product_name_snapshot from public.purchase_order_items limit 1), '采购测试玩具', '商品快照由服务端写入');
select throws_ok($$select public.save_purchase_order_draft(null, '20000000-0000-0000-0000-000000000001', null, '[{"productId":"30000000-0000-0000-0000-000000000001","quantity":1,"unitCost":6},{"productId":"30000000-0000-0000-0000-000000000001","quantity":2,"unitCost":6}]'::jsonb)$$, 'P0001', 'DUPLICATE_PRODUCT', '同一采购单不能重复商品');
select throws_ok($$select public.save_purchase_order_draft(null, '20000000-0000-0000-0000-000000000002', null, '[{"productId":"30000000-0000-0000-0000-000000000001","quantity":1,"unitCost":6}]'::jsonb)$$, 'P0001', 'SUPPLIER_INACTIVE', '停用供应商不能新建采购单');

select lives_ok(format('select public.confirm_purchase_order(%L)', (select id from public.purchase_orders where remark = '首批采购')), '草稿可以确认');
select is((select status from public.purchase_orders where remark = '首批采购'), 'confirmed'::public.purchase_order_status, '确认后状态冻结');
select throws_ok(format('select public.save_purchase_order_draft(%L, %L, null, %L::jsonb)', (select id from public.purchase_orders where remark = '首批采购'), '20000000-0000-0000-0000-000000000001', '[{"productId":"30000000-0000-0000-0000-000000000001","quantity":3,"unitCost":6}]'), 'P0001', 'PURCHASE_NOT_EDITABLE', '已确认采购单不能编辑');
select lives_ok(format('select public.cancel_purchase_order(%L)', (select id from public.purchase_orders where remark = '首批采购')), '未到货未付款采购单可以取消');
select is((select status from public.purchase_orders where remark = '首批采购'), 'cancelled'::public.purchase_order_status, '取消状态正确');

update public.users set role = 'staff' where id = '10000000-0000-0000-0000-000000000001';
select is(((public.get_purchase_order((select id from public.purchase_orders where remark = '首批采购'))->'items'->0->>'unitCost')::numeric), 12.5::numeric, '店员可读取采购单价');
select is((select cost_price from public.list_products('', null) where id = '30000000-0000-0000-0000-000000000001'), null::numeric, '店员仍不能读取商品成本');

do $$ begin perform set_config('request.jwt.claim.sub', '', true); end $$;
select throws_ok($$select public.save_purchase_order_draft(null, '20000000-0000-0000-0000-000000000001', null, '[{"productId":"30000000-0000-0000-0000-000000000001","quantity":1,"unitCost":6}]'::jsonb)$$, '42501', 'active user required', '未登录用户不能保存采购单');

do $$ begin perform set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true); end $$;
update public.users set status = 'disabled' where id = '10000000-0000-0000-0000-000000000001';
select throws_ok($$select public.save_purchase_order_draft(null, '20000000-0000-0000-0000-000000000001', null, '[{"productId":"30000000-0000-0000-0000-000000000001","quantity":1,"unitCost":6}]'::jsonb)$$, '42501', 'active user required', '禁用用户不能保存采购单');

select * from finish();
rollback;
