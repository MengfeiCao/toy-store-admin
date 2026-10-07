import { toAppError } from '../../lib/app-error';
import type { Json } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import type { PostPurchaseReceiptInput, PurchaseOrderDetail, PurchaseOrderDraftInput, PurchaseOrderFilters, PurchaseOrderListItem, PurchaseReceiptDetail, PurchaseReceiptFilters, PurchaseReceiptListItem } from './purchase.types';

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

export async function getPurchaseReceipt(id: string): Promise<PurchaseReceiptDetail | null> {
  const { data, error } = await supabase.rpc('get_purchase_receipt', { p_receipt_id: id });
  if (error) throw toAppError(error);
  return data as unknown as PurchaseReceiptDetail | null;
}

export async function postPurchaseReceipt(input: PostPurchaseReceiptInput): Promise<string> {
  const items = input.items.map(({ purchaseOrderItemId, quantity }) => ({ purchaseOrderItemId, quantity }));
  const { data, error } = await supabase.rpc('post_purchase_receipt', {
    p_request_id: input.requestId,
    p_purchase_order_id: input.purchaseOrderId,
    p_remark: input.remark?.trim() || null,
    p_items: items as Json,
  });
  if (!error) return String(data);
  const appError = toAppError(error);
  if (appError.code === 'network') {
    const existing = await getPurchaseReceipt(input.requestId);
    if (existing) return existing.id;
  }
  throw appError;
}

export async function listPurchaseReceipts(filters: PurchaseReceiptFilters): Promise<PurchaseReceiptListItem[]> {
  const { data, error } = await supabase.rpc('list_purchase_receipts', {
    p_query: filters.query?.trim() ?? '',
    p_purchase_order_id: filters.purchaseOrderId || null,
    p_supplier_id: filters.supplierId || null,
    p_date: filters.date || null,
  });
  if (error) throw toAppError(error);
  return (data ?? []).map((row) => ({ id: row.id, receiptNo: row.receipt_no, purchaseOrderId: row.purchase_order_id, purchaseOrderNo: row.purchase_order_no, supplierName: row.supplier_name, receivedAt: row.received_at, totalQuantity: row.total_quantity }));
}

export async function getSupplierPayment(id: string): Promise<{ id: string; purchaseOrderId: string; amount: number; paidAt: string } | null> {
  const { data, error } = await supabase.rpc('get_supplier_payment', { p_payment_id: id });
  if (error) throw toAppError(error);
  return data as { id: string; purchaseOrderId: string; amount: number; paidAt: string } | null;
}

export async function markPurchaseOrderPaid(orderId: string, requestId: string): Promise<string> {
  const { data, error } = await supabase.rpc('mark_purchase_order_paid', { p_purchase_order_id: orderId, p_request_id: requestId });
  if (!error) return String(data);
  const appError = toAppError(error);
  if (appError.code === 'network') {
    const existing = await getSupplierPayment(requestId);
    if (existing) return existing.id;
  }
  throw appError;
}
