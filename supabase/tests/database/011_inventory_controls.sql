begin;
select plan(23);

select has_type('public', 'stock_count_status', '盘点状态枚举存在');
select has_type('public', 'stock_adjustment_type', '库存调整类型枚举存在');
select has_table('public', 'stock_counts', '盘点表存在');
select has_table('public', 'stock_count_items', '盘点明细表存在');
select has_table('public', 'stock_adjustments', '调整表存在');
select has_table('public', 'stock_adjustment_items', '调整明细表存在');
select has_column('public', 'stock_records', 'stock_adjustment_item_id', '流水关联调整明细');
select ok(to_regprocedure('public.create_stock_count(text)') is not null, '创建盘点函数存在');
select ok(to_regprocedure('public.save_stock_count_draft(uuid,jsonb)') is not null, '保存盘点草稿函数存在');
select ok(to_regprocedure('public.confirm_stock_count(uuid,uuid)') is not null, '确认盘点函数存在');
select ok(to_regprocedure('public.post_stock_adjustment(uuid,public.stock_adjustment_type,text,jsonb)') is not null, '库存调整函数存在');

insert into auth.users (id, email) values ('12000000-0000-0000-0000-000000000001', 'inventory@test.local');
insert into public.users (id, name, role, status) values ('12000000-0000-0000-0000-000000000001', '库存店员', 'staff', 'active');
do $$ begin perform set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000001', true); end $$;
insert into public.products (id, sku, name, category, cost_price, sale_price, stock_qty, low_stock_threshold) values
('32000000-0000-0000-0000-000000000001', 'INV-1', '库存玩具一', '测试', 10, 20, 5, 6),
('32000000-0000-0000-0000-000000000002', 'INV-2', '库存玩具二', '测试', 12, 24, 3, 2);

select lives_ok($$select public.create_stock_count('月度盘点')$$, '创建盘点成功');
select is((select count(*)::integer from public.stock_count_items), 2, '盘点快照包含全部启用商品');
select is((select book_quantity from public.stock_count_items where product_id = '32000000-0000-0000-0000-000000000001'), 5, '盘点保存账面库存快照');

select lives_ok(format('select public.save_stock_count_draft(%L, %L::jsonb)', (select id from public.stock_counts limit 1), format('[{"itemId":"%s","actualQuantity":7},{"itemId":"%s","actualQuantity":3}]', (select id from public.stock_count_items where product_id = '32000000-0000-0000-0000-000000000001'), (select id from public.stock_count_items where product_id = '32000000-0000-0000-0000-000000000002'))), '保存盘点实盘数量');
select lives_ok(format('select public.confirm_stock_count(%L, %L)', '62000000-0000-4000-8000-000000000001', (select id from public.stock_counts limit 1)), '确认盘点并生成差异');
select is((select stock_qty from public.products where id = '32000000-0000-0000-0000-000000000001'), 7, '盘盈更新库存');
select is((select count(*)::integer from public.stock_adjustments where type = 'stock_count'), 1, '盘点差异生成调整单');
select lives_ok(format('select public.confirm_stock_count(%L, %L)', '62000000-0000-4000-8000-000000000001', (select id from public.stock_counts limit 1)), '相同盘点请求可重放');

select lives_ok($$select public.post_stock_adjustment('62000000-0000-4000-8000-000000000002', 'shortage', '破损短缺', '[{"productId":"32000000-0000-0000-0000-000000000001","quantityDelta":-2}]'::jsonb)$$, '直接短缺调整成功');
select is((select stock_qty from public.products where id = '32000000-0000-0000-0000-000000000001'), 5, '短缺调整扣减库存');
select throws_ok($$select public.post_stock_adjustment('62000000-0000-4000-8000-000000000003', 'shortage', '超量扣减', '[{"productId":"32000000-0000-0000-0000-000000000001","quantityDelta":-99},{"productId":"32000000-0000-0000-0000-000000000002","quantityDelta":-1}]'::jsonb)$$, 'P0001', 'INSUFFICIENT_STOCK', '多商品失败整单回滚');
select is((select stock_qty from public.products where id = '32000000-0000-0000-0000-000000000002'), 3, '失败调整不修改其他商品');

select * from finish();
rollback;
