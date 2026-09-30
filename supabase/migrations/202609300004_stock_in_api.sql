create or replace function public.save_stock_in_draft(
  p_order_id uuid default null,
  p_remark text default null,
  p_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid := p_order_id;
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
begin
  if not public.is_active_user() then
    raise exception 'active user required' using errcode = '42501';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'at least one stock-in item is required' using errcode = '22023';
  end if;

  if v_order_id is null then
    insert into public.stock_in_orders (order_no, remark, created_by)
    values ('RK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)), nullif(trim(p_remark), ''), auth.uid())
    returning id into v_order_id;
  else
    perform 1
    from public.stock_in_orders
    where id = v_order_id and created_by = auth.uid() and status = 'draft'
    for update;
    if not found then
      raise exception 'draft stock-in order not found' using errcode = 'P0002';
    end if;
    update public.stock_in_orders set remark = nullif(trim(p_remark), '') where id = v_order_id;
    delete from public.stock_in_items where stock_in_order_id = v_order_id;
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'productId')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;
    if v_quantity is null or v_quantity <= 0 then
      raise exception 'stock-in quantity must be positive' using errcode = '22023';
    end if;
    insert into public.stock_in_items (stock_in_order_id, product_id, quantity)
    values (v_order_id, v_product_id, v_quantity);
  end loop;

  return v_order_id;
end;
$$;

create or replace function public.get_stock_in(p_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', o.id,
    'orderNo', o.order_no,
    'status', o.status,
    'remark', o.remark,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('productId', i.product_id, 'quantity', i.quantity) order by i.id)
      from public.stock_in_items i
      where i.stock_in_order_id = o.id
    ), '[]'::jsonb)
  )
  from public.stock_in_orders o
  where o.id = p_order_id
    and public.is_active_user()
    and (o.created_by = auth.uid() or public.current_user_role() = 'owner');
$$;

create or replace function public.post_stock_in(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.stock_in_orders%rowtype;
  v_item public.stock_in_items%rowtype;
begin
  if not public.is_active_user() then
    raise exception 'active user required' using errcode = '42501';
  end if;

  select * into v_order from public.stock_in_orders where id = p_order_id for update;
  if not found or (v_order.created_by <> auth.uid() and public.current_user_role() <> 'owner') then
    raise exception 'stock-in order not found' using errcode = 'P0002';
  end if;
  if v_order.status = 'posted' then
    return;
  end if;
  if not exists (select 1 from public.stock_in_items where stock_in_order_id = p_order_id) then
    raise exception 'stock-in order has no items' using errcode = '22023';
  end if;

  perform set_config('app.allow_stock_mutation', 'on', true);
  for v_item in select * from public.stock_in_items where stock_in_order_id = p_order_id order by id
  loop
    update public.products set stock_qty = stock_qty + v_item.quantity where id = v_item.product_id;
    if not found then
      raise exception 'product not found' using errcode = 'P0002';
    end if;
    insert into public.stock_records (product_id, quantity_delta, stock_in_item_id, created_by)
    values (v_item.product_id, v_item.quantity, v_item.id, auth.uid());
  end loop;
  update public.stock_in_orders
  set status = 'posted', posted_by = auth.uid(), posted_at = now()
  where id = p_order_id;
end;
$$;

create or replace function public.list_stock_records(
  p_product_id uuid default null,
  p_source text default null,
  p_date date default null
)
returns table (
  id uuid,
  product_id uuid,
  product_name text,
  sku text,
  quantity_delta integer,
  source text,
  source_order_no text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.product_id,
    p.name,
    p.sku,
    r.quantity_delta,
    case when r.stock_in_item_id is not null then 'stock_in' else 'sales' end,
    coalesce(si.order_no, so.order_no),
    r.created_at
  from public.stock_records r
  join public.products p on p.id = r.product_id
  left join public.stock_in_items sii on sii.id = r.stock_in_item_id
  left join public.stock_in_orders si on si.id = sii.stock_in_order_id
  left join public.sales_order_items soi on soi.id = r.sales_order_item_id
  left join public.sales_orders so on so.id = soi.sales_order_id
  where public.is_active_user()
    and (p_product_id is null or r.product_id = p_product_id)
    and (p_source is null or (p_source = 'stock_in' and r.stock_in_item_id is not null) or (p_source = 'sales' and r.sales_order_item_id is not null))
    and (p_date is null or r.created_at::date = p_date)
  order by r.created_at desc;
$$;

grant execute on function public.save_stock_in_draft(uuid, text, jsonb) to authenticated;
grant execute on function public.get_stock_in(uuid) to authenticated;
grant execute on function public.post_stock_in(uuid) to authenticated;
grant execute on function public.list_stock_records(uuid, text, date) to authenticated;
