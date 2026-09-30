export type SalesOrderStatus = 'draft' | 'pending_shipment' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid';
export type PaymentMethod = 'wechat' | 'alipay' | 'cash' | 'other';
export interface SalesOrderItemDraft { productId: string; quantity: number; }
export interface SalesOrderDetailItem extends SalesOrderItemDraft { id: string; productName: string; sku: string; unitPrice: number; handledQuantity?: number; }
export interface SalesOrderDetail { id: string; orderNo: string; customerId: string | null; customerName: string; status: SalesOrderStatus; totalAmount: number; netAmount?: number; refundedAmount?: number; paymentStatus: PaymentStatus; paymentMethod?: PaymentMethod | null; remark?: string | null; createdAt?: string; shippedAt?: string | null; paidAt?: string | null; items: SalesOrderDetailItem[]; }
export interface SalesOrderListItem { id: string; orderNo: string; customerName: string; status: SalesOrderStatus; totalAmount: number; paymentStatus: PaymentStatus; createdAt: string; }
export interface SalesOrderFilters { query?: string; status?: SalesOrderStatus | 'all'; paymentStatus?: PaymentStatus | 'all'; date?: string; }
