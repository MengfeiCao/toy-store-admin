export type SalesOrderStatus = 'draft' | 'pending_shipment' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid';
export interface SalesOrderItemDraft { productId: string; quantity: number; }
export interface SalesOrderDetailItem extends SalesOrderItemDraft { productName: string; sku: string; unitPrice: number; }
export interface SalesOrderDetail { id: string; orderNo: string; customerId: string | null; customerName: string; status: SalesOrderStatus; totalAmount: number; paymentStatus: PaymentStatus; remark?: string | null; items: SalesOrderDetailItem[]; }
export interface SalesOrderListItem { id: string; orderNo: string; customerName: string; status: SalesOrderStatus; totalAmount: number; paymentStatus: PaymentStatus; createdAt: string; }
export interface SalesOrderFilters { query?: string; status?: SalesOrderStatus | 'all'; paymentStatus?: PaymentStatus | 'all'; date?: string; }
