import { toAppError } from '../../lib/app-error';
import type { Json } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import type { StockInDetail, StockInDraftInput, StockRecord, StockRecordFilters } from './stock.types';

export async function saveStockInDraft(input: StockInDraftInput): Promise<string> {
  const items = input.items.map((item) => ({ productId: item.productId, quantity: item.quantity }));
  const { data, error } = await supabase.rpc('save_stock_in_draft', { p_order_id: input.orderId ?? null, p_remark: input.remark ?? null, p_items: items as Json });
  if (error) throw toAppError(error);
  return String(data);
}

export async function getStockIn(id: string): Promise<StockInDetail> {
  const { data, error } = await supabase.rpc('get_stock_in', { p_order_id: id });
  if (error) throw toAppError(error);
  const detail = data as { id: string; orderNo: string; status: StockInDetail['status']; remark?: string | null; items: Array<{ productId: string; quantity: number }> };
  return detail;
}

export async function postStockIn(orderId: string): Promise<void> {
  const { error } = await supabase.rpc('post_stock_in', { p_order_id: orderId });
  if (!error) return;
  const detail = await getStockIn(orderId);
  if (detail.status === 'posted') return;
  throw toAppError(error);
}

export async function listStockRecords(filters: StockRecordFilters): Promise<StockRecord[]> {
  const { data, error } = await supabase.rpc('list_stock_records', { p_product_id: filters.productId ?? null, p_source: filters.source && filters.source !== 'all' ? filters.source : null, p_date: filters.date ?? null });
  if (error) throw toAppError(error);
  return (data ?? []).map((record) => ({ id: record.id, productId: record.product_id, productName: record.product_name, sku: record.sku, quantityDelta: record.quantity_delta, source: record.source as StockRecord['source'], sourceOrderNo: record.source_order_no, createdAt: record.created_at }));
}
