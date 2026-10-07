export type ReportRange = { from: string; to: string };

export type ReportSummary = {
  grossSales: number;
  refundAmount: number;
  netSales: number;
  orderCount: number;
  netCost?: number;
  grossProfit?: number;
};

export type DailyReport = ReportSummary & { date: string };

export type ProductReport = Omit<ReportSummary, 'orderCount'> & {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
};

export type BusinessReport = {
  role: 'owner' | 'staff';
  from: string;
  to: string;
  summary: ReportSummary;
  daily: DailyReport[];
  products: ProductReport[];
  inventory: { totalQuantity: number; lowStockCount: number; damageQuantity: number; inventoryValue?: number };
  purchases: { purchaseAmount: number; receivedQuantity: number; paidAmount: number; unpaidAmount: number };
  afterSales: { returnQuantity: number; exchangeQuantity: number; damageQuantity: number; refundAmount: number };
  slowMoving: Array<{ id: string; sku: string; name: string; stockQty: number; lastSoldAt: string | null }>;
};
