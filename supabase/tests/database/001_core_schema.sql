begin;

select plan(18);

select has_table('public', 'users', 'users 表存在');
select has_table('public', 'products', 'products 表存在');
select has_table('public', 'customers', 'customers 表存在');
select has_table('public', 'stock_in_orders', 'stock_in_orders 表存在');
select has_table('public', 'stock_in_items', 'stock_in_items 表存在');
select has_table('public', 'sales_orders', 'sales_orders 表存在');
select has_table('public', 'sales_order_items', 'sales_order_items 表存在');
select has_table('public', 'stock_records', 'stock_records 表存在');

select has_type('public', 'app_role', 'app_role 枚举存在');
select has_type('public', 'sales_order_status', 'sales_order_status 枚举存在');
select has_type('public', 'payment_status', 'payment_status 枚举存在');

select has_index('public', 'products_sku_key', 'products.sku 唯一');
select has_index('public', 'stock_in_orders_order_no_key', '入库单号唯一');
select has_index('public', 'sales_orders_order_no_key', '销售订单号唯一');
select has_index('public', 'stock_records_stock_in_item_unique', '入库流水来源唯一');
select has_index('public', 'stock_records_sales_order_item_unique', '出库流水来源唯一');

select is(
  (select count(*)::integer from pg_constraint where conrelid = 'public.stock_records'::regclass and contype = 'c'),
  2,
  '库存流水来源和变动数量约束存在'
);
select is(
  (select count(*)::integer from pg_constraint where conrelid = 'public.products'::regclass and contype = 'c'),
  7,
  '商品必填字段、价格和库存约束存在'
);

select * from finish();
rollback;
