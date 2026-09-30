begin;

select plan(9);

select ok(to_regprocedure('public.list_products(text,public.product_status)') is not null, 'list_products 函数存在');
select ok(to_regprocedure('public.create_product(text,text,text,text,text,text,numeric,numeric,integer,text)') is not null, 'create_product 函数存在');
select ok(to_regprocedure('public.update_product_public(uuid,text,text,text,text,text,integer,text)') is not null, 'update_product_public 函数存在');
select ok(to_regprocedure('public.update_product_pricing(uuid,numeric,numeric)') is not null, 'update_product_pricing 函数存在');
select ok(to_regprocedure('public.set_product_status(uuid,public.product_status)') is not null, 'set_product_status 函数存在');
select is((select prosecdef from pg_proc where oid = 'public.list_products(text,public.product_status)'::regprocedure), true, '商品查询使用 security definer');
select is((select count(*)::integer from storage.buckets where id = 'product-images'), 1, '商品图片 bucket 存在');
select is((select relrowsecurity from pg_class where oid = 'public.products'::regclass), true, '商品表保留 RLS');
select ok((select lower(pg_get_functiondef('public.list_products(text,public.product_status)'::regprocedure)) like '%current_user_role() = ''owner'' or p.status = ''active''%'), '店员只能查询在售商品');

select * from finish();
rollback;
