import { toAppError } from '../../lib/app-error';
import { supabase } from '../../lib/supabase';
import type { BusinessReport, ReportRange } from './reports.types';

export async function getBusinessReport(range: ReportRange): Promise<BusinessReport> {
  const { data, error } = await supabase.rpc('get_business_report', { p_from: range.from, p_to: range.to });
  if (error) throw toAppError(error);
  const report = data as unknown as Omit<BusinessReport, 'slowMoving'> & { slowMoving: Array<{ id: string; sku: string; name: string; stock_qty: number; last_sold_at: string | null }> };
  return { ...report, slowMoving: report.slowMoving.map((row) => ({ id: row.id, sku: row.sku, name: row.name, stockQty: row.stock_qty, lastSoldAt: row.last_sold_at })) };
}
