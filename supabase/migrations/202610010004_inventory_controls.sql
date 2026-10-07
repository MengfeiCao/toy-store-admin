do $$ begin create type public.stock_count_status as enum ('draft', 'confirmed', 'cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.stock_adjustment_type as enum ('stock_count', 'surplus', 'shortage', 'damage', 'manual'); exception when duplicate_object then null; end $$;

create table public.stock_counts (
  id uuid primary key default gen_random_uuid(), count_no text not null unique,
  status public.stock_count_status not null default 'draft', remark text,
  created_by uuid not null references public.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  confirmed_by uuid references public.users(id), confirmed_at timestamptz, confirmation_request_id uuid unique
);
create table public.stock_count_items (
  id uuid primary key default gen_random_uuid(), stock_count_id uuid not null references public.stock_counts(id) on delete cascade,
  product_id uuid not null references public.products(id), product_name_snapshot text not null, sku_snapshot text not null,
  book_quantity integer not null check (book_quantity >= 0), actual_quantity integer check (actual_quantity is null or actual_quantity >= 0),
  difference_quantity integer, unique (stock_count_id, product_id)
);
create table public.stock_adjustments (
  id uuid primary key, adjustment_no text not null unique, type public.stock_adjustment_type not null,
  reason text not null check (char_length(trim(reason)) > 0), stock_count_id uuid unique references public.stock_counts(id),
  created_by uuid not null references public.users(id), created_at timestamptz not null default now(), request_payload jsonb not null
);
create table public.stock_adjustment_items (
  id uuid primary key default gen_random_uuid(), stock_adjustment_id uuid not null references public.stock_adjustments(id),
  product_id uuid not null references public.products(id), quantity_delta integer not null check (quantity_delta <> 0),
  before_quantity integer not null check (before_quantity >= 0), after_quantity integer not null check (after_quantity >= 0 and after_quantity = before_quantity + quantity_delta),
  product_name_snapshot text not null, sku_snapshot text not null, unique (stock_adjustment_id, product_id)
);
create trigger stock_counts_touch_updated_at before update on public.stock_counts for each row execute function public.touch_updated_at();
create trigger stock_adjustments_immutable before update or delete on public.stock_adjustments for each row execute function public.protect_stock_records();
create trigger stock_adjustment_items_immutable before update or delete on public.stock_adjustment_items for each row execute function public.protect_stock_records();

alter table public.stock_records add column stock_adjustment_item_id uuid references public.stock_adjustment_items(id);
alter table public.stock_records drop constraint stock_records_source_check;
alter table public.stock_records add constraint stock_records_source_check check (
  (stock_in_item_id is not null)::integer + (sales_order_item_id is not null)::integer
  + (purchase_receipt_item_id is not null)::integer + (stock_adjustment_item_id is not null)::integer = 1
);
create unique index stock_records_stock_adjustment_item_unique on public.stock_records(stock_adjustment_item_id) where stock_adjustment_item_id is not null;

revoke all on public.stock_counts, public.stock_count_items, public.stock_adjustments, public.stock_adjustment_items from anon, authenticated;
grant usage on type public.stock_count_status, public.stock_adjustment_type to authenticated;
grant select on public.stock_counts, public.stock_count_items, public.stock_adjustments, public.stock_adjustment_items to authenticated;
alter table public.stock_counts enable row level security; alter table public.stock_count_items enable row level security;
alter table public.stock_adjustments enable row level security; alter table public.stock_adjustment_items enable row level security;
create policy stock_counts_select_active on public.stock_counts for select to authenticated using (public.is_active_user());
create policy stock_count_items_select_active on public.stock_count_items for select to authenticated using (public.is_active_user());
create policy stock_adjustments_select_active on public.stock_adjustments for select to authenticated using (public.is_active_user());
create policy stock_adjustment_items_select_active on public.stock_adjustment_items for select to authenticated using (public.is_active_user());

create or replace function public.list_inventory(p_query text default '', p_alert_only boolean default false)
returns table(id uuid, sku text, barcode text, name text, category text, stock_qty integer, low_stock_threshold integer, status public.product_status)
language sql stable security definer set search_path=public as $$
 select p.id,p.sku,p.barcode,p.name,p.category,p.stock_qty,p.low_stock_threshold,p.status from public.products p
 where public.is_active_user() and (nullif(trim(p_query),'') is null or p.name ilike '%'||trim(p_query)||'%' or p.sku ilike '%'||trim(p_query)||'%' or coalesce(p.barcode,'') ilike '%'||trim(p_query)||'%')
 and (not p_alert_only or (p.low_stock_threshold is not null and p.stock_qty <= p.low_stock_threshold)) order by p.name
$$;

create or replace function public.create_stock_count(p_remark text) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if not public.is_active_user() then raise exception 'active user required' using errcode='42501'; end if;
 insert into public.stock_counts(count_no,remark,created_by) values('PD-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),nullif(trim(p_remark),''),auth.uid()) returning id into v_id;
 insert into public.stock_count_items(stock_count_id,product_id,product_name_snapshot,sku_snapshot,book_quantity)
 select v_id,id,name,sku,stock_qty from public.products where status='active';
 return v_id;
end $$;

create or replace function public.save_stock_count_draft(p_stock_count_id uuid,p_items jsonb) returns void language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
 if not public.is_active_user() then raise exception 'active user required' using errcode='42501'; end if;
 perform 1 from public.stock_counts where id=p_stock_count_id and status='draft' for update; if not found then raise exception 'STOCK_COUNT_NOT_EDITABLE'; end if;
 if exists(select 1 from jsonb_array_elements(p_items) x where (x->>'actualQuantity')::integer < 0) then raise exception 'invalid actual quantity'; end if;
 update public.stock_count_items i set actual_quantity=(x->>'actualQuantity')::integer from jsonb_array_elements(p_items) x where i.id=(x->>'itemId')::uuid and i.stock_count_id=p_stock_count_id;
 get diagnostics v_count=row_count; if v_count<>jsonb_array_length(p_items) then raise exception 'stock count item not found'; end if;
end $$;

create or replace function public.confirm_stock_count(p_request_id uuid,p_stock_count_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare v_count public.stock_counts%rowtype; v_payload jsonb;
begin
 if not public.is_active_user() then raise exception 'active user required' using errcode='42501'; end if;
 select * into v_count from public.stock_counts where id=p_stock_count_id for update; if not found then raise exception 'stock count not found'; end if;
 if v_count.status='confirmed' then if v_count.confirmation_request_id=p_request_id then return p_request_id; else raise exception 'REQUEST_ID_CONFLICT'; end if; end if;
 if v_count.status<>'draft' then raise exception 'STOCK_COUNT_NOT_EDITABLE'; end if;
 if exists(select 1 from public.stock_adjustments where id=p_request_id) then raise exception 'REQUEST_ID_CONFLICT'; end if;
 perform 1 from public.products p join public.stock_count_items i on i.product_id=p.id where i.stock_count_id=p_stock_count_id order by p.id for update;
 if exists(select 1 from public.stock_count_items i join public.products p on p.id=i.product_id where i.stock_count_id=p_stock_count_id and p.stock_qty<>i.book_quantity) then raise exception 'STOCK_COUNT_STALE'; end if;
 if exists(select 1 from public.stock_count_items where stock_count_id=p_stock_count_id and actual_quantity is null) then raise exception 'actual quantity required'; end if;
 update public.stock_count_items set difference_quantity=actual_quantity-book_quantity where stock_count_id=p_stock_count_id;
 if exists(select 1 from public.stock_count_items where stock_count_id=p_stock_count_id and difference_quantity<>0) then
   v_payload:=jsonb_build_object('stockCountId',p_stock_count_id);
   insert into public.stock_adjustments(id,adjustment_no,type,reason,stock_count_id,created_by,request_payload) values(p_request_id,'TZ-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),'stock_count','盘点差异',p_stock_count_id,auth.uid(),v_payload);
   insert into public.stock_adjustment_items(stock_adjustment_id,product_id,quantity_delta,before_quantity,after_quantity,product_name_snapshot,sku_snapshot)
   select p_request_id,product_id,difference_quantity,book_quantity,actual_quantity,product_name_snapshot,sku_snapshot from public.stock_count_items where stock_count_id=p_stock_count_id and difference_quantity<>0;
   perform set_config('app.allow_stock_mutation','on',true);
   update public.products p set stock_qty=i.after_quantity from public.stock_adjustment_items i where i.stock_adjustment_id=p_request_id and p.id=i.product_id;
   insert into public.stock_records(product_id,quantity_delta,stock_adjustment_item_id,created_by) select product_id,quantity_delta,id,auth.uid() from public.stock_adjustment_items where stock_adjustment_id=p_request_id;
 end if;
 update public.stock_counts set status='confirmed',confirmed_by=auth.uid(),confirmed_at=now(),confirmation_request_id=p_request_id where id=p_stock_count_id;
 return p_request_id;
end $$;

create or replace function public.cancel_stock_count(p_stock_count_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin if not public.is_active_user() then raise exception 'active user required' using errcode='42501'; end if;
 update public.stock_counts set status='cancelled' where id=p_stock_count_id and status='draft'; if not found then raise exception 'STOCK_COUNT_NOT_EDITABLE'; end if; end $$;

create or replace function public.post_stock_adjustment(p_request_id uuid,p_type public.stock_adjustment_type,p_reason text,p_items jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare v_payload jsonb; v_existing jsonb; v_count integer;
begin
 if not public.is_active_user() then raise exception 'active user required' using errcode='42501'; end if;
 if p_type='stock_count' or nullif(trim(p_reason),'') is null or p_items is null or jsonb_array_length(p_items)=0 then raise exception 'invalid adjustment'; end if;
 v_payload:=jsonb_build_object('type',p_type,'reason',trim(p_reason),'items',p_items);
 select request_payload into v_existing from public.stock_adjustments where id=p_request_id; if found then if v_existing=v_payload then return p_request_id; else raise exception 'REQUEST_ID_CONFLICT'; end if; end if;
 if exists(select 1 from jsonb_array_elements(p_items) x group by x->>'productId' having count(*)>1) then raise exception 'DUPLICATE_PRODUCT'; end if;
 if exists(select 1 from jsonb_array_elements(p_items) x where (x->>'quantityDelta')::integer=0 or (p_type='surplus' and (x->>'quantityDelta')::integer<0) or (p_type in ('shortage','damage') and (x->>'quantityDelta')::integer>0)) then raise exception 'invalid adjustment sign'; end if;
 perform 1 from public.products p join jsonb_array_elements(p_items) x on p.id=(x->>'productId')::uuid order by p.id for update;
 select count(*) into v_count from public.products p join jsonb_array_elements(p_items) x on p.id=(x->>'productId')::uuid; if v_count<>jsonb_array_length(p_items) then raise exception 'product not found'; end if;
 if exists(select 1 from public.products p join jsonb_array_elements(p_items) x on p.id=(x->>'productId')::uuid where p.stock_qty+(x->>'quantityDelta')::integer<0) then raise exception 'INSUFFICIENT_STOCK'; end if;
 insert into public.stock_adjustments(id,adjustment_no,type,reason,created_by,request_payload) values(p_request_id,'TZ-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),p_type,trim(p_reason),auth.uid(),v_payload);
 insert into public.stock_adjustment_items(stock_adjustment_id,product_id,quantity_delta,before_quantity,after_quantity,product_name_snapshot,sku_snapshot)
 select p_request_id,p.id,(x->>'quantityDelta')::integer,p.stock_qty,p.stock_qty+(x->>'quantityDelta')::integer,p.name,p.sku from public.products p join jsonb_array_elements(p_items) x on p.id=(x->>'productId')::uuid;
 perform set_config('app.allow_stock_mutation','on',true); update public.products p set stock_qty=i.after_quantity from public.stock_adjustment_items i where i.stock_adjustment_id=p_request_id and p.id=i.product_id;
 insert into public.stock_records(product_id,quantity_delta,stock_adjustment_item_id,created_by) select product_id,quantity_delta,id,auth.uid() from public.stock_adjustment_items where stock_adjustment_id=p_request_id;
 return p_request_id;
end $$;

create or replace function public.get_stock_count(p_id uuid) returns jsonb language sql stable security definer set search_path=public as $$ select jsonb_build_object('id',c.id,'countNo',c.count_no,'status',c.status,'remark',c.remark,'items',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'productId',i.product_id,'productName',i.product_name_snapshot,'sku',i.sku_snapshot,'bookQuantity',i.book_quantity,'actualQuantity',i.actual_quantity,'differenceQuantity',i.difference_quantity) order by i.sku_snapshot) from public.stock_count_items i where i.stock_count_id=c.id),'[]'::jsonb)) from public.stock_counts c where c.id=p_id and public.is_active_user() $$;
create or replace function public.list_stock_counts(p_query text default '',p_status public.stock_count_status default null,p_date date default null) returns table(id uuid,count_no text,status public.stock_count_status,created_at timestamptz) language sql stable security definer set search_path=public as $$ select c.id,c.count_no,c.status,c.created_at from public.stock_counts c where public.is_active_user() and (p_status is null or c.status=p_status) and (p_date is null or c.created_at::date=p_date) and (nullif(trim(p_query),'') is null or c.count_no ilike '%'||trim(p_query)||'%') order by c.created_at desc $$;
create or replace function public.list_stock_adjustments(p_query text default '',p_type public.stock_adjustment_type default null,p_date date default null) returns table(id uuid,adjustment_no text,type public.stock_adjustment_type,reason text,created_at timestamptz) language sql stable security definer set search_path=public as $$ select a.id,a.adjustment_no,a.type,a.reason,a.created_at from public.stock_adjustments a where public.is_active_user() and (p_type is null or a.type=p_type) and (p_date is null or a.created_at::date=p_date) and (nullif(trim(p_query),'') is null or a.adjustment_no ilike '%'||trim(p_query)||'%' or a.reason ilike '%'||trim(p_query)||'%') order by a.created_at desc $$;

revoke execute on function public.list_inventory(text,boolean),public.create_stock_count(text),public.save_stock_count_draft(uuid,jsonb),public.confirm_stock_count(uuid,uuid),public.cancel_stock_count(uuid),public.post_stock_adjustment(uuid,public.stock_adjustment_type,text,jsonb),public.get_stock_count(uuid),public.list_stock_counts(text,public.stock_count_status,date),public.list_stock_adjustments(text,public.stock_adjustment_type,date) from public,anon;
grant execute on function public.list_inventory(text,boolean),public.create_stock_count(text),public.save_stock_count_draft(uuid,jsonb),public.confirm_stock_count(uuid,uuid),public.cancel_stock_count(uuid),public.post_stock_adjustment(uuid,public.stock_adjustment_type,text,jsonb),public.get_stock_count(uuid),public.list_stock_counts(text,public.stock_count_status,date),public.list_stock_adjustments(text,public.stock_adjustment_type,date) to authenticated;
