begin;

select plan(16);

select has_type('public', 'supplier_status', '供应商状态枚举存在');
select enum_has_labels('public', 'supplier_status', array['active', 'inactive'], '供应商状态值正确');
select has_table('public', 'suppliers', '供应商表存在');
select has_column('public', 'suppliers', 'created_by', '供应商记录创建人');
select has_column('public', 'suppliers', 'updated_at', '供应商记录更新时间');
select col_default_is('public', 'suppliers', 'created_by', 'auth.uid()', '创建人默认当前用户');
select is((select relrowsecurity from pg_class where oid = 'public.suppliers'::regclass), true, '供应商表启用 RLS');
select is((select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'suppliers' and cmd = 'SELECT'), 1, '供应商只有一条查询策略');
select is((select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'suppliers' and cmd = 'INSERT'), 1, '供应商只有一条新增策略');
select is((select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'suppliers' and cmd = 'UPDATE'), 1, '供应商只有一条更新策略');
select ok((select lower(qual) like '%is_active_user%' from pg_policies where schemaname = 'public' and tablename = 'suppliers' and cmd = 'SELECT'), '只有活跃用户可查询供应商');
select ok((select lower(with_check) like '%is_active_user%' from pg_policies where schemaname = 'public' and tablename = 'suppliers' and cmd = 'INSERT'), '活跃店主和店员可新增供应商');
select ok((select lower(qual) like '%is_active_user%' and lower(with_check) like '%is_active_user%' from pg_policies where schemaname = 'public' and tablename = 'suppliers' and cmd = 'UPDATE'), '活跃店主和店员可编辑及启停供应商');
select is(has_table_privilege('authenticated', 'public.suppliers', 'DELETE'), false, '认证用户不能删除供应商');
select is(has_table_privilege('anon', 'public.suppliers', 'SELECT'), false, '未登录用户不能查询供应商');
select ok((select lower(qual) not like '%status%active%' from pg_policies where schemaname = 'public' and tablename = 'suppliers' and cmd = 'SELECT'), '查询策略不隐藏已停用供应商');

select * from finish();
rollback;
