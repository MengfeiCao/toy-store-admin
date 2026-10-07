import { toAppError } from '../../lib/app-error';
import { supabase } from '../../lib/supabase';
import type { PaymentMethod, SalesOrderDetail, SalesOrderFilters, SalesOrderListItem } from './sales.types';

export interface SaveSalesOrderInput { id?: string; customerId: string | null; remark?: string; items: Array<{ productId: string; quantity: number }>; confirm: boolean; }

export async function saveSalesOrder(input: SaveSalesOrderInput): Promise<string> {
  const { data, error } = await supabase.rpc('save_sales_order', { p_order_id: input.id ?? null, p_customer_id: input.customerId, p_remark: input.remark ?? null, p_items: input.items, p_confirm: input.confirm });
  if (error) throw toAppError(error);
  return String(data);
}

export async function getSalesOrder(id: string): Promise<SalesOrderDetail> {
  const { data, error } = await supabase.rpc('get_sales_order', { p_order_id: id });
  if (error) throw toAppError(error);
  return data as unknown as SalesOrderDetail;
}

export async function listSalesOrders(filters: SalesOrderFilters): Promise<SalesOrderListItem[]> {
  const { data, error } = await supabase.rpc('list_sales_orders', { p_query: filters.query?.trim() ?? '', p_status: filters.status && filters.status !== 'all' ? filters.status : null, p_payment_status: filters.paymentStatus && filters.paymentStatus !== 'all' ? filters.paymentStatus : null, p_date: filters.date ?? null });
  if (error) throw toAppError(error);
  return ((data ?? []) as Array<{ id: string; order_no: string; customer_name: string | null; status: SalesOrderListItem['status']; total_amount: number; payment_status: SalesOrderListItem['paymentStatus']; created_at: string }>).map((row) => ({ id: row.id, orderNo: row.order_no, customerName: row.customer_name ?? '散客', status: row.status, totalAmount: Number(row.total_amount), paymentStatus: row.payment_status, createdAt: row.created_at }));
}

export async function cancelSalesOrder(id: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_sales_order', { p_order_id: id });
  if (error) throw toAppError(error);
}

export async function shipSalesOrder(id: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('ship_sales_order', { p_order_id: id });
    if (!error) return;
    throw error;
  } catch (cause) {
    const detail = await getSalesOrder(id);
    if (detail.status === 'completed') return;
    throw toAppError(cause);
  }
}

export async function markSalesOrderPaid(id: string, method: PaymentMethod): Promise<void> {
  const { error } = await supabase.rpc('mark_sales_order_paid', { p_order_id: id, p_payment_method: method });
  if (error) throw toAppError(error);
}

export async function revertSalesOrderPayment(id: string): Promise<void> {
  const { error } = await supabase.rpc('revert_sales_order_payment', { p_order_id: id });
  if (error) throw toAppError(error);
}
