do $$ begin create type public.after_sales_type as enum ('return', 'exchange'); exception when duplicate_object then null; end $$;
do $$ begin create type public.after_sales_status as enum ('completed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.after_sales_condition as enum ('good', 'damaged'); exception when duplicate_object then null; end $$;

create table public.after_sales_orders (
  id uuid primary key,
  after_sales_no text not null unique,
  sales_order_id uuid not null references public.sales_orders(id),
  type public.after_sales_type not null,
  status public.after_sales_status not null default 'completed',
  remark text,
  created_by uuid not null references public.users(id),
  completed_at timestamptz not null default now(),
  request_payload jsonb not null
);

create table public.after_sales_items (
  id uuid primary key default gen_random_uuid(),
  after_sales_order_id uuid not null references public.after_sales_orders(id),
  sales_order_item_id uuid not null references public.sales_order_items(id),
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  condition public.after_sales_condition not null,
  product_name_snapshot text not null,
  sku_snapshot text not null,
  unit_price_snapshot numeric(12,2) not null check (unit_price_snapshot >= 0),
  unit_cost_snapshot numeric(12,2),
  unique (after_sales_order_id, sales_order_item_id)
);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  after_sales_order_id uuid not null unique references public.after_sales_orders(id),
  sales_order_id uuid not null references public.sales_orders(id),
  amount numeric(12,2) not null check (amount > 0),
  refunded_by uuid not null references public.users(id),
  refunded_at timestamptz not null default now()
);

alter table public.stock_records
  add column after_sales_item_id uuid references public.after_sales_items(id),
  add column after_sales_action text;
alter table public.stock_records drop constraint stock_records_source_check;
alter table public.stock_records add constraint stock_records_source_check check (
  (stock_in_item_id is not null)::integer + (sales_order_item_id is not null)::integer
  + (purchase_receipt_item_id is not null)::integer + (stock_adjustment_item_id is not null)::integer
  + (after_sales_item_id is not null)::integer = 1
  and ((after_sales_item_id is null and after_sales_action is null)
    or (after_sales_item_id is not null and after_sales_action in ('return_in', 'exchange_out')))
);
create unique index stock_records_after_sales_action_unique
  on public.stock_records(after_sales_item_id, after_sales_action)
  where after_sales_item_id is not null;

create trigger after_sales_orders_immutable before update or delete on public.after_sales_orders for each row execute function public.protect_stock_records();
create trigger after_sales_items_immutable before update or delete on public.after_sales_items for each row execute function public.protect_stock_records();
create trigger refunds_immutable before update or delete on public.refunds for each row execute function public.protect_stock_records();

revoke all on public.after_sales_orders, public.after_sales_items, public.refunds from anon, authenticated;
grant usage on type public.after_sales_type, public.after_sales_status, public.after_sales_condition to authenticated;
grant select on public.after_sales_orders, public.after_sales_items, public.refunds to authenticated;
alter table public.after_sales_orders enable row level security;
alter table public.after_sales_items enable row level security;
alter table public.refunds enable row level security;
create policy after_sales_orders_select_active on public.after_sales_orders for select to authenticated using (public.is_active_user());
create policy after_sales_items_select_active on public.after_sales_items for select to authenticated using (public.is_active_user());
create policy refunds_select_active on public.refunds for select to authenticated using (public.is_active_user());

create or replace function public.post_after_sales(
  p_request_id uuid,
  p_sales_order_id uuid,
  p_type public.after_sales_type,
  p_remark text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.sales_orders%rowtype;
  v_payload jsonb;
  v_existing jsonb;
  v_item_count integer;
  v_valid_count integer;
  v_refund numeric(12,2);
begin
  if not public.is_active_user() then raise exception 'active user required' using errcode='42501'; end if;
  if p_request_id is null then raise exception 'request id required'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'after-sales items required'; end if;
  v_payload := jsonb_build_object('salesOrderId',p_sales_order_id,'type',p_type,'remark',nullif(trim(p_remark),''),'items',p_items);
  select request_payload into v_existing from public.after_sales_orders where id=p_request_id;
  if found then
    if v_existing=v_payload then return p_request_id; end if;
    raise exception 'REQUEST_ID_CONFLICT';
  end if;

  select * into v_order from public.sales_orders where id=p_sales_order_id for update;
  if not found or v_order.status<>'completed' then raise exception 'AFTER_SALES_ORDER_NOT_ELIGIBLE'; end if;
  if exists(select 1 from jsonb_array_elements(p_items) x group by x->>'salesOrderItemId' having count(*)>1) then raise exception 'DUPLICATE_PRODUCT'; end if;
  if exists(select 1 from jsonb_array_elements(p_items) x where nullif(x->>'salesOrderItemId','') is null or coalesce((x->>'quantity')::integer,0)<=0 or x->>'condition' not in ('good','damaged')) then raise exception 'invalid after-sales item'; end if;

  perform 1 from public.sales_order_items i where i.sales_order_id=p_sales_order_id order by i.product_id for update;
  select count(*) into v_item_count from jsonb_array_elements(p_items);
  select count(*) into v_valid_count from jsonb_array_elements(p_items) x join public.sales_order_items i on i.id=(x->>'salesOrderItemId')::uuid and i.sales_order_id=p_sales_order_id;
  if v_valid_count<>v_item_count then raise exception 'sales item not found'; end if;
  if exists(
    select 1 from jsonb_array_elements(p_items) x
    join public.sales_order_items i on i.id=(x->>'salesOrderItemId')::uuid
    where (x->>'quantity')::integer + coalesce((select sum(ai.quantity) from public.after_sales_items ai join public.after_sales_orders ao on ao.id=ai.after_sales_order_id where ai.sales_order_item_id=i.id and ao.status='completed'),0) > i.quantity
  ) then raise exception 'AFTER_SALES_QUANTITY_EXCEEDED'; end if;

  perform 1 from public.products p join public.sales_order_items i on i.product_id=p.id join jsonb_array_elements(p_items) x on i.id=(x->>'salesOrderItemId')::uuid order by p.id for update;
  insert into public.after_sales_orders(id,after_sales_no,sales_order_id,type,remark,created_by,request_payload)
  values(p_request_id,'SH-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),p_sales_order_id,p_type,nullif(trim(p_remark),''),auth.uid(),v_payload);
  insert into public.after_sales_items(after_sales_order_id,sales_order_item_id,product_id,quantity,condition,product_name_snapshot,sku_snapshot,unit_price_snapshot,unit_cost_snapshot)
  select p_request_id,i.id,i.product_id,(x->>'quantity')::integer,(x->>'condition')::public.after_sales_condition,i.product_name_snapshot,i.sku_snapshot,i.unit_price,i.unit_cost_snapshot
  from jsonb_array_elements(p_items) x join public.sales_order_items i on i.id=(x->>'salesOrderItemId')::uuid;

  perform set_config('app.allow_stock_mutation','on',true);
  update public.products p set stock_qty=p.stock_qty+returned.quantity
  from (select product_id,sum(quantity)::integer quantity from public.after_sales_items where after_sales_order_id=p_request_id and condition='good' group by product_id) returned
  where p.id=returned.product_id;
  insert into public.stock_records(product_id,quantity_delta,after_sales_item_id,after_sales_action,created_by)
  select product_id,quantity,id,'return_in',auth.uid() from public.after_sales_items where after_sales_order_id=p_request_id and condition='good';

  if p_type='exchange' then
    if exists(select 1 from public.products p join (select product_id,sum(quantity)::integer quantity from public.after_sales_items where after_sales_order_id=p_request_id group by product_id) outgoing on outgoing.product_id=p.id where p.stock_qty<outgoing.quantity) then
      raise exception 'INSUFFICIENT_STOCK';
    end if;
    update public.products p set stock_qty=p.stock_qty-outgoing.quantity
    from (select product_id,sum(quantity)::integer quantity from public.after_sales_items where after_sales_order_id=p_request_id group by product_id) outgoing
    where p.id=outgoing.product_id;
    insert into public.stock_records(product_id,quantity_delta,after_sales_item_id,after_sales_action,created_by)
    select product_id,-quantity,id,'exchange_out',auth.uid() from public.after_sales_items where after_sales_order_id=p_request_id;
  elsif v_order.payment_status='paid' then
    select sum(quantity*unit_price_snapshot)::numeric(12,2) into v_refund from public.after_sales_items where after_sales_order_id=p_request_id;
    insert into public.refunds(after_sales_order_id,sales_order_id,amount,refunded_by) values(p_request_id,p_sales_order_id,v_refund,auth.uid());
  end if;
  return p_request_id;
end;
$$;

create or replace function public.get_sales_order(p_order_id uuid)
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'id',o.id,'orderNo',o.order_no,'customerId',o.customer_id,'customerName',coalesce(c.name,'散客'),'status',o.status,
    'totalAmount',o.total_amount,'paymentStatus',o.payment_status,'paymentMethod',o.payment_method,'remark',o.remark,
    'refundedAmount',coalesce((select sum(r.amount) from public.refunds r where r.sales_order_id=o.id),0),
    'netAmount',o.total_amount-coalesce((select sum(ai.quantity*ai.unit_price_snapshot) from public.after_sales_items ai join public.after_sales_orders ao on ao.id=ai.after_sales_order_id where ao.sales_order_id=o.id and ao.type='return' and ao.status='completed'),0),
    'items',coalesce((select jsonb_agg(jsonb_build_object(
      'id',i.id,'productId',i.product_id,'productName',i.product_name_snapshot,'sku',i.sku_snapshot,'quantity',i.quantity,'unitPrice',i.unit_price,
      'handledQuantity',coalesce((select sum(ai.quantity) from public.after_sales_items ai join public.after_sales_orders ao on ao.id=ai.after_sales_order_id where ai.sales_order_item_id=i.id and ao.status='completed'),0)
    ) order by i.id) from public.sales_order_items i where i.sales_order_id=o.id),'[]'::jsonb)
  ) from public.sales_orders o left join public.customers c on c.id=o.customer_id
  where o.id=p_order_id and public.is_active_user();
$$;

create or replace function public.list_after_sales(p_query text default '',p_type public.after_sales_type default null,p_date date default null)
returns table(id uuid,after_sales_no text,sales_order_id uuid,sales_order_no text,customer_name text,type public.after_sales_type,total_quantity integer,refund_amount numeric,completed_at timestamptz)
language sql stable security definer set search_path=public as $$
  select ao.id,ao.after_sales_no,ao.sales_order_id,so.order_no,coalesce(c.name,'散客'),ao.type,sum(ai.quantity)::integer,coalesce(r.amount,0),ao.completed_at
  from public.after_sales_orders ao join public.sales_orders so on so.id=ao.sales_order_id left join public.customers c on c.id=so.customer_id join public.after_sales_items ai on ai.after_sales_order_id=ao.id left join public.refunds r on r.after_sales_order_id=ao.id
  where public.is_active_user() and (p_type is null or ao.type=p_type) and (p_date is null or timezone('Asia/Shanghai',ao.completed_at)::date=p_date)
    and (nullif(trim(p_query),'') is null or ao.after_sales_no ilike '%'||trim(p_query)||'%' or so.order_no ilike '%'||trim(p_query)||'%' or coalesce(c.name,'散客') ilike '%'||trim(p_query)||'%')
  group by ao.id,so.order_no,c.name,r.amount order by ao.completed_at desc;
$$;

create or replace function public.get_after_sales(p_id uuid) returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('id',ao.id,'afterSalesNo',ao.after_sales_no,'salesOrderId',ao.sales_order_id,'salesOrderNo',so.order_no,'type',ao.type,'status',ao.status,'remark',ao.remark,'completedAt',ao.completed_at,'refundAmount',coalesce(r.amount,0),'items',coalesce((select jsonb_agg(jsonb_build_object('id',ai.id,'productName',ai.product_name_snapshot,'sku',ai.sku_snapshot,'quantity',ai.quantity,'condition',ai.condition,'unitPrice',ai.unit_price_snapshot) order by ai.id) from public.after_sales_items ai where ai.after_sales_order_id=ao.id),'[]'::jsonb))
 from public.after_sales_orders ao join public.sales_orders so on so.id=ao.sales_order_id left join public.refunds r on r.after_sales_order_id=ao.id where ao.id=p_id and public.is_active_user();
$$;

create or replace function public.list_stock_records(p_product_id uuid default null,p_source text default null,p_date date default null)
returns table(id uuid,product_id uuid,product_name text,sku text,quantity_delta integer,source text,source_order_no text,created_at timestamptz)
language sql stable security definer set search_path=public as $$
 select r.id,r.product_id,p.name,p.sku,r.quantity_delta,
  case when r.stock_in_item_id is not null then 'stock_in' when r.sales_order_item_id is not null then 'sales' when r.purchase_receipt_item_id is not null then 'purchase_receipt'
    when r.after_sales_action='return_in' then 'return_in' when r.after_sales_action='exchange_out' then 'exchange_out'
    when a.type='stock_count' then 'stock_count' when a.type='surplus' then 'surplus' when a.type='shortage' then 'shortage' when a.type='damage' then 'damage' else 'manual' end,
  coalesce(si.order_no,so.order_no,pr.receipt_no,a.adjustment_no,ao.after_sales_no),r.created_at
 from public.stock_records r join public.products p on p.id=r.product_id
 left join public.stock_in_items sii on sii.id=r.stock_in_item_id left join public.stock_in_orders si on si.id=sii.stock_in_order_id
 left join public.sales_order_items soi on soi.id=r.sales_order_item_id left join public.sales_orders so on so.id=soi.sales_order_id
 left join public.purchase_receipt_items pri on pri.id=r.purchase_receipt_item_id left join public.purchase_receipts pr on pr.id=pri.purchase_receipt_id
 left join public.stock_adjustment_items sai on sai.id=r.stock_adjustment_item_id left join public.stock_adjustments a on a.id=sai.stock_adjustment_id
 left join public.after_sales_items asi on asi.id=r.after_sales_item_id left join public.after_sales_orders ao on ao.id=asi.after_sales_order_id
 where public.is_active_user() and (p_product_id is null or r.product_id=p_product_id)
 and (p_source is null or p_source=case when r.stock_in_item_id is not null then 'stock_in' when r.sales_order_item_id is not null then 'sales' when r.purchase_receipt_item_id is not null then 'purchase_receipt' when r.after_sales_action='return_in' then 'return_in' when r.after_sales_action='exchange_out' then 'exchange_out' when a.type='stock_count' then 'stock_count' when a.type='surplus' then 'surplus' when a.type='shortage' then 'shortage' when a.type='damage' then 'damage' else 'manual' end)
 and (p_date is null or timezone('Asia/Shanghai',r.created_at)::date=p_date) order by r.created_at desc;
$$;

revoke execute on function public.post_after_sales(uuid,uuid,public.after_sales_type,text,jsonb),public.list_after_sales(text,public.after_sales_type,date),public.get_after_sales(uuid) from public,anon;
grant execute on function public.post_after_sales(uuid,uuid,public.after_sales_type,text,jsonb),public.list_after_sales(text,public.after_sales_type,date),public.get_after_sales(uuid) to authenticated;
