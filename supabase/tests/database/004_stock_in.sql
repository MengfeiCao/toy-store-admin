begin;

select plan(13);

select ok(to_regprocedure('public.save_stock_in_draft(uuid,text,jsonb)') is not null, 'save_stock_in_draft 函数存在');
select ok(to_regprocedure('public.get_stock_in(uuid)') is not null, 'get_stock_in 函数存在');
select ok(to_regprocedure('public.post_stock_in(uuid)') is not null, 'post_stock_in 函数存在');
select ok(to_regprocedure('public.list_stock_records(uuid,text,date)') is not null, 'list_stock_records 函数存在');
select is((select prosecdef from pg_proc where oid = 'public.post_stock_in(uuid)'::regprocedure), true, '确认入库使用 security definer');
select is((select prosecdef from pg_proc where oid = 'public.save_stock_in_draft(uuid,text,jsonb)'::regprocedure), true, '草稿保存使用 security definer');
select is((select relrowsecurity from pg_class where oid = 'public.stock_in_orders'::regclass), true, '入库单保留 RLS');
select is((select relrowsecurity from pg_class where oid = 'public.stock_records'::regclass), true, '库存流水保留 RLS');
select ok(exists (select 1 from pg_trigger where tgname = 'products_stock_protection'), '库存变更保护触发器存在');
select ok(exists (select 1 from pg_trigger where tgname = 'stock_records_immutable'), '库存流水不可变触发器存在');
select ok((select pg_get_functiondef('public.save_stock_in_draft(uuid,text,jsonb)'::regprocedure) not like '%created_by = auth.uid()%'), '所有活跃店员可继续编辑入库草稿');
select ok((select pg_get_functiondef('public.get_stock_in(uuid)'::regprocedure) not like '%created_by = auth.uid()%'), '所有活跃店员可查看入库单详情');
select ok((select pg_get_functiondef('public.post_stock_in(uuid)'::regprocedure) not like '%created_by <> auth.uid()%'), '所有活跃店员可确认入库');

select * from finish();
rollback;
