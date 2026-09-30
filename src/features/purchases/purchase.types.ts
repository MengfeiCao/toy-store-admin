export type PurchaseOrderStatus = 'draft' | 'confirmed' | 'partially_received' | 'completed' | 'cancelled';
export type PurchasePaymentStatus = 'unpaid' | 'paid';

export interface PurchaseOrderListItem {
  id: string;
  orderNo: string;
  supplierName: string;
  status: PurchaseOrderStatus;
  totalAmount: number;
  paymentStatus: PurchasePaymentStatus;
  createdAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  receivedQuantity: number;
  unitCost: number;
  amount: number;
}

export interface PurchaseOrderDetail {
  id: string;
  orderNo: string;
  supplierId: string;
  supplierName: string;
  status: PurchaseOrderStatus;
  totalAmount: number;
  paymentStatus: PurchasePaymentStatus;
  remark?: string | null;
  createdAt?: string;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
  items: PurchaseOrderItem[];
}

export interface PurchaseOrderDraftInput {
  id?: string;
  supplierId: string;
  remark?: string;
  items: Array<{ productId: string; quantity: number; unitCost: number }>;
}

export interface PurchaseOrderFilters {
  query?: string;
  supplierId?: string;
  status?: PurchaseOrderStatus | 'all';
  paymentStatus?: PurchasePaymentStatus | 'all';
  date?: string;
}

export interface PostPurchaseReceiptInput {
  requestId: string;
  purchaseOrderId: string;
  remark?: string;
  items: Array<{ purchaseOrderItemId: string; quantity: number }>;
}

export interface PurchaseReceiptListItem {
  id: string;
  receiptNo: string;
  purchaseOrderId: string;
  purchaseOrderNo: string;
  supplierName: string;
  receivedAt: string;
  totalQuantity: number;
}

export interface PurchaseReceiptDetail {
  id: string;
  receiptNo: string;
  purchaseOrderId: string;
  purchaseOrderNo: string;
  supplierName: string;
  receivedAt: string;
  remark?: string | null;
  items: Array<{ id: string; purchaseOrderItemId: string; productId: string; productName: string; sku: string; quantity: number; unitCost: number }>;
}

export interface PurchaseReceiptFilters {
  query?: string;
  purchaseOrderId?: string;
  supplierId?: string;
  date?: string;
}
