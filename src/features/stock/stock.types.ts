import type { Database } from '../../lib/database.types';

export type StockInStatus = Database['public']['Enums']['stock_in_status'];

export interface StockInItemDraft { productId: string; quantity: number; }
export interface StockInDetail { id: string; orderNo: string; status: StockInStatus; remark?: string | null; items: StockInItemDraft[]; }
export interface StockInHistoryItem { id: string; orderNo: string; status: StockInStatus; totalQuantity: number; createdAt: string; postedAt?: string | null; }
export type StockRecordSource = 'stock_in' | 'sales' | 'purchase_receipt' | 'stock_count' | 'surplus' | 'shortage' | 'damage' | 'manual';
export interface StockRecordFilters { productId?: string; source?: 'all' | StockRecordSource; date?: string; }
export interface StockRecord { id: string; productId: string; productName: string; sku: string; quantityDelta: number; source: StockRecordSource; sourceOrderNo: string | null; createdAt: string; }
