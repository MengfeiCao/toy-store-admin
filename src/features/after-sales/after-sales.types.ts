export type AfterSalesType = 'return' | 'exchange';
export type AfterSalesCondition = 'good' | 'damaged';

export interface AfterSalesInput {
  requestId: string;
  salesOrderId: string;
  type: AfterSalesType;
  remark?: string;
  items: Array<{ salesOrderItemId: string; quantity: number; condition: AfterSalesCondition }>;
}

export interface AfterSalesListItem {
  id: string;
  afterSalesNo: string;
  salesOrderId: string;
  salesOrderNo: string;
  customerName: string;
  type: AfterSalesType;
  totalQuantity: number;
  refundAmount: number;
  completedAt: string;
}

export interface AfterSalesDetail {
  id: string;
  afterSalesNo: string;
  salesOrderId: string;
  salesOrderNo: string;
  type: AfterSalesType;
  status: 'completed';
  remark?: string | null;
  completedAt: string;
  refundAmount: number;
  items: Array<{ id: string; productName: string; sku: string; quantity: number; condition: AfterSalesCondition; unitPrice: number }>;
}
