begin;

select plan(9);

select has_function('public', 'current_user_role', ARRAY[]::text[], 'current_user_role 函数存在');
select has_function('public', 'require_owner', ARRAY[]::text[], 'require_owner 函数存在');

select is(
  (select has_table_privilege('authenticated', 'public.products', 'SELECT (id, sku, barcode, name, category, brand, age_range, sale_price, stock_qty, low_stock_threshold, image_path, status, created_at, updated_at)')),
  true,
  '认证用户可以读取商品公开字段'
);
select is(
  (select has_table_privilege('authenticated', 'public.products', 'SELECT (cost_price)')),
  false,
  '认证用户不能直接读取商品成本字段'
);
select is(
  (select has_table_privilege('authenticated', 'public.sales_order_items', 'SELECT (unit_cost_snapshot)')),
  false,
  '认证用户不能直接读取订单成本快照'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.products'::regclass),
  true,
  'products 启用 RLS'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.sales_order_items'::regclass),
  true,
  'sales_order_items 启用 RLS'
);
select is(
  (select prosecdef from pg_proc where oid = 'public.current_user_role()'::regprocedure),
  true,
  'current_user_role 使用 security definer'
);
select is(
  (select prosecdef from pg_proc where oid = 'public.require_owner()'::regprocedure),
  true,
  'require_owner 使用 security definer'
);

select * from finish();
rollback;
