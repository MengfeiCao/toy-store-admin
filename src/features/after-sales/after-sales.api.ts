import { toAppError } from '../../lib/app-error';
import type { Json } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import type { AfterSalesDetail, AfterSalesInput, AfterSalesListItem, AfterSalesType } from './after-sales.types';

export async function postAfterSales(input: AfterSalesInput): Promise<string> {
  const { data, error } = await supabase.rpc('post_after_sales', {
    p_request_id: input.requestId,
    p_sales_order_id: input.salesOrderId,
    p_type: input.type,
    p_remark: input.remark?.trim() || null,
    p_items: input.items as Json,
  });
  if (error) throw toAppError(error);
  return String(data);
}

export async function listAfterSales(filters: { query?: string; type?: AfterSalesType | 'all'; date?: string }): Promise<AfterSalesListItem[]> {
  const { data, error } = await supabase.rpc('list_after_sales', {
    p_query: filters.query?.trim() ?? '',
    p_type: filters.type && filters.type !== 'all' ? filters.type : null,
    p_date: filters.date ?? null,
  });
  if (error) throw toAppError(error);
  return (data ?? []).map((row) => ({ id: row.id, afterSalesNo: row.after_sales_no, salesOrderId: row.sales_order_id, salesOrderNo: row.sales_order_no, customerName: row.customer_name, type: row.type, totalQuantity: row.total_quantity, refundAmount: Number(row.refund_amount), completedAt: row.completed_at }));
}

export async function getAfterSales(id: string): Promise<AfterSalesDetail> {
  const { data, error } = await supabase.rpc('get_after_sales', { p_id: id });
  if (error) throw toAppError(error);
  return data as unknown as AfterSalesDetail;
}
