begin;
select plan(9);

select ok(to_regprocedure('public.list_stock_in_history(text,public.stock_in_status,date)') is not null, '历史手工入库列表函数存在');

insert into auth.users (id, email) values ('13000000-0000-0000-0000-000000000001', 'retired-stock-in@test.local');
insert into public.users (id, name, role, status) values ('13000000-0000-0000-0000-000000000001', '库存店员', 'staff', 'active');
do $$ begin perform set_config('request.jwt.claim.sub', '13000000-0000-0000-0000-000000000001', true); end $$;
insert into public.products (id, sku, name, category, cost_price, sale_price, stock_qty) values
('33000000-0000-0000-0000-000000000001', 'RET-1', '历史入库玩具', '测试', 10, 20, 1);
insert into public.stock_in_orders (id, order_no, status, created_by) values
('43000000-0000-0000-0000-000000000001', 'RK-HISTORY', 'draft', '13000000-0000-0000-0000-000000000001');
insert into public.stock_in_items (stock_in_order_id, product_id, quantity) values
('43000000-0000-0000-0000-000000000001', '33000000-0000-0000-0000-000000000001', 2);

select throws_ok(
  $$select public.save_stock_in_draft(null, null, '[{"productId":"33000000-0000-0000-0000-000000000001","quantity":2}]'::jsonb)$$,
  'P0001', 'MANUAL_STOCK_IN_DISABLED', '手工入库草稿写入已停用'
);
select throws_ok(
  $$select public.post_stock_in('43000000-0000-0000-0000-000000000001')$$,
  'P0001', 'MANUAL_STOCK_IN_DISABLED', '手工入库确认已停用'
);
select is((select count(*)::integer from public.list_stock_in_history('RK-HISTORY', null, null)), 1, '历史入库仍可列表查询');
select is((public.get_stock_in('43000000-0000-0000-0000-000000000001')->>'orderNo'), 'RK-HISTORY', '历史入库详情仍可读取');
select ok(position('purchase_receipt' in pg_get_functiondef('public.list_stock_records(uuid,text,date)'::regprocedure)) > 0, '流水包含采购到货来源');
select ok(position('stock_count' in pg_get_functiondef('public.list_stock_records(uuid,text,date)'::regprocedure)) > 0, '流水包含盘点来源');
select ok(position('damage' in pg_get_functiondef('public.list_stock_records(uuid,text,date)'::regprocedure)) > 0, '流水包含调整来源');
select ok(position('Asia/Shanghai' in pg_get_functiondef('public.get_dashboard(date,date)'::regprocedure)) > 0, '经营数据按门店时区归档');

select * from finish();
rollback;
