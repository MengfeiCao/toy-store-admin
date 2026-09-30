import { toAppError } from '../../lib/app-error';
import type { Json } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import type { PurchaseOrderDetail, PurchaseOrderDraftInput, PurchaseOrderFilters, PurchaseOrderListItem } from './purchase.types';

export async function listPurchaseOrders(filters: PurchaseOrderFilters): Promise<PurchaseOrderListItem[]> {
  const { data, error } = await supabase.rpc('list_purchase_orders', {
    p_query: filters.query?.trim() ?? '',
    p_supplier_id: filters.supplierId || null,
    p_status: filters.status && filters.status !== 'all' ? filters.status : null,
    p_payment_status: filters.paymentStatus && filters.paymentStatus !== 'all' ? filters.paymentStatus : null,
    p_date: filters.date || null,
  });
  if (error) throw toAppError(error);
  return (data ?? []).map((row) => ({
    id: row.id,
    orderNo: row.order_no,
    supplierName: row.supplier_name,
    status: row.status,
    totalAmount: Number(row.total_amount),
    paymentStatus: row.payment_status,
    createdAt: row.created_at,
  }));
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrderDetail> {
  const { data, error } = await supabase.rpc('get_purchase_order', { p_order_id: id });
  if (error) throw toAppError(error);
  return data as unknown as PurchaseOrderDetail;
}

export async function savePurchaseOrderDraft(input: PurchaseOrderDraftInput): Promise<string> {
  const items = input.items.map(({ productId, quantity, unitCost }) => ({ productId, quantity, unitCost }));
  const { data, error } = await supabase.rpc('save_purchase_order_draft', {
    p_order_id: input.id ?? null,
    p_supplier_id: input.supplierId,
    p_remark: input.remark?.trim() || null,
    p_items: items as Json,
  });
  if (error) throw toAppError(error);
  return String(data);
}

export async function confirmPurchaseOrder(id: string): Promise<void> {
  const { error } = await supabase.rpc('confirm_purchase_order', { p_order_id: id });
  if (error) throw toAppError(error);
}

export async function cancelPurchaseOrder(id: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_purchase_order', { p_order_id: id });
  if (error) throw toAppError(error);
}
