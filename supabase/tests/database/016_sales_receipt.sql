begin;
select plan(2);

insert into auth.users(id,email) values ('16000000-0000-0000-0000-000000000001','receipt@test.local');
insert into public.users(id,name,role,status) values ('16000000-0000-0000-0000-000000000001','小票测试','staff','active');
select set_config('request.jwt.claim.sub','16000000-0000-0000-0000-000000000001',true);
insert into public.sales_orders(id,order_no,status,total_amount,payment_status,created_by,created_at,confirmed_by,confirmed_at,shipped_by,shipped_at) values
('46000000-0000-0000-0000-000000000001','XS-RECEIPT','completed',0,'unpaid','16000000-0000-0000-0000-000000000001','2026-10-01 01:00+00','16000000-0000-0000-0000-000000000001','2026-10-01 01:05+00','16000000-0000-0000-0000-000000000001','2026-10-01 01:10+00');

select is(public.get_sales_order('46000000-0000-0000-0000-000000000001')->>'createdAt','2026-10-01T01:00:00+00:00','小票返回订单创建时间');
select is(public.get_sales_order('46000000-0000-0000-0000-000000000001')->>'shippedAt','2026-10-01T01:10:00+00:00','小票返回出库时间');

select * from finish();
rollback;
