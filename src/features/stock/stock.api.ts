import { toAppError } from '../../lib/app-error';
import { supabase } from '../../lib/supabase';
import type { StockInDetail, StockInHistoryItem, StockRecord, StockRecordFilters } from './stock.types';

export async function getStockIn(id: string): Promise<StockInDetail> {
  const { data, error } = await supabase.rpc('get_stock_in', { p_order_id: id });
  if (error) throw toAppError(error);
  const detail = data as { id: string; orderNo: string; status: StockInDetail['status']; remark?: string | null; items: Array<{ productId: string; quantity: number }> };
  return detail;
}

export async function listStockInHistory(): Promise<StockInHistoryItem[]> {
  const { data, error } = await supabase.rpc('list_stock_in_history', { p_query: '', p_status: null, p_date: null });
  if (error) throw toAppError(error);
  return (data ?? []).map((item) => ({
    id: item.id,
    orderNo: item.order_no,
    status: item.status,
    totalQuantity: item.total_quantity,
    createdAt: item.created_at,
    postedAt: item.posted_at,
  }));
}

export async function listStockRecords(filters: StockRecordFilters): Promise<StockRecord[]> {
  const { data, error } = await supabase.rpc('list_stock_records', { p_product_id: filters.productId ?? null, p_source: filters.source && filters.source !== 'all' ? filters.source : null, p_date: filters.date ?? null });
  if (error) throw toAppError(error);
  return (data ?? []).map((record) => ({ id: record.id, productId: record.product_id, productName: record.product_name, sku: record.sku, quantityDelta: record.quantity_delta, source: record.source as StockRecord['source'], sourceOrderNo: record.source_order_no, createdAt: record.created_at }));
}
