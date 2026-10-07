import { toAppError } from '../../lib/app-error';
import { supabase } from '../../lib/supabase';
import type { Dashboard, DateRange, LowStockProduct } from './dashboard.types';

export async function getDashboard(range: DateRange): Promise<Dashboard> {
  const { data, error } = await supabase.rpc('get_dashboard', { p_from: range.from, p_to: range.to });
  if (error) throw toAppError(error);
  return data as unknown as Dashboard;
}

export async function listLowStockProducts(): Promise<LowStockProduct[]> {
  const { data, error } = await supabase.rpc('list_low_stock_products');
  if (error) throw toAppError(error);
  return ((data ?? []) as Array<{ id: string; sku: string; name: string; stock_qty: number; low_stock_threshold: number }>).map((row) => ({ id: row.id, sku: row.sku, name: row.name, stockQty: row.stock_qty, lowStockThreshold: row.low_stock_threshold }));
}
