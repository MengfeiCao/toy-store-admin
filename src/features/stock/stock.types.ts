import type { Database } from '../../lib/database.types';

export type StockInStatus = Database['public']['Enums']['stock_in_status'];

export interface StockInItemDraft { productId: string; quantity: number; }
export interface StockInDraftInput { orderId?: string; remark?: string; items: StockInItemDraft[]; }
export interface StockInDetail { id: string; orderNo: string; status: StockInStatus; remark?: string | null; items: StockInItemDraft[]; }
export interface StockRecordFilters { productId?: string; source?: 'all' | 'stock_in' | 'sales'; date?: string; }
export interface StockRecord { id: string; productId: string; productName: string; sku: string; quantityDelta: number; source: 'stock_in' | 'sales'; sourceOrderNo: string | null; createdAt: string; }
