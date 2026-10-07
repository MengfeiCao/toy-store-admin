begin;
select plan(5);
select ok(to_regprocedure('public.list_inventory(text,boolean)') is not null, '库存查询函数存在');
select ok(to_regprocedure('public.list_stock_counts(text,public.stock_count_status,date)') is not null, '盘点列表函数存在');
select ok(to_regprocedure('public.get_stock_count(uuid)') is not null, '盘点详情函数存在');
select ok(to_regprocedure('public.list_stock_adjustments(text,public.stock_adjustment_type,date)') is not null, '调整列表函数存在');
select ok((select lower(pg_get_functiondef('public.post_stock_adjustment(uuid,public.stock_adjustment_type,text,jsonb)'::regprocedure)) like '%for update%'), '库存调整按行锁防止并发负库存');
select * from finish();
rollback;
