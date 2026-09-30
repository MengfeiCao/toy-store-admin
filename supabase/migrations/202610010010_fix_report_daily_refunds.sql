alter function public.get_business_report(date, date) rename to get_business_report_base_202610010009;
revoke execute on function public.get_business_report_base_202610010009(date, date) from public, anon, authenticated;

create function public.get_business_report(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_report jsonb;
  v_daily jsonb;
begin
  v_report := public.get_business_report_base_202610010009(p_from, p_to);
  select coalesce(jsonb_agg(
    case when day ? 'grossProfit' then
      day || jsonb_build_object(
        'refundAmount', refund_amount,
        'netSales', (day->>'grossSales')::numeric - refund_amount,
        'grossProfit', (day->>'grossSales')::numeric - refund_amount - (day->>'netCost')::numeric
      )
    else
      day || jsonb_build_object(
        'refundAmount', refund_amount,
        'netSales', (day->>'grossSales')::numeric - refund_amount
      )
    end order by day->>'date'
  ), '[]'::jsonb)
  into v_daily
  from jsonb_array_elements(v_report->'daily') day
  cross join lateral (
    select coalesce(sum(r.amount), 0) refund_amount
    from public.refunds r
    join public.after_sales_orders ao on ao.id = r.after_sales_order_id
    where timezone('Asia/Shanghai', ao.completed_at)::date = (day->>'date')::date
  ) refunds;
  return jsonb_set(v_report, '{daily}', v_daily);
end;
$$;

revoke execute on function public.get_business_report(date, date) from public, anon;
grant execute on function public.get_business_report(date, date) to authenticated;
