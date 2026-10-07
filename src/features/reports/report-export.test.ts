import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { buildReportWorkbook } from './report-export';
import type { BusinessReport } from './reports.types';

const baseReport: BusinessReport = {
  role: 'owner', from: '2026-10-01', to: '2026-10-31',
  summary: { grossSales: 100, refundAmount: 20, netSales: 80, orderCount: 1, netCost: 30, grossProfit: 50 },
  daily: [{ date: '2026-10-01', grossSales: 100, refundAmount: 20, netSales: 80, orderCount: 1, netCost: 30, grossProfit: 50 }],
  products: [{ productId: 'p1', productName: '恐龙积木', sku: 'DLJM-1', quantity: 2, grossSales: 100, refundAmount: 20, netSales: 80, netCost: 30, grossProfit: 50 }],
  inventory: { totalQuantity: 8, lowStockCount: 1, damageQuantity: 0, inventoryValue: 120 },
  purchases: { purchaseAmount: 60, receivedQuantity: 3, paidAmount: 60, unpaidAmount: 0 },
  afterSales: { returnQuantity: 1, exchangeQuantity: 0, damageQuantity: 0, refundAmount: 20 },
  slowMoving: [{ id: 'p2', sku: 'SLOW-1', name: '慢销玩具', stockQty: 2, lastSoldAt: null }],
};

describe('report export', () => {
  it('uses the same report payload for all workbook sheets', () => {
    const workbook = buildReportWorkbook(baseReport);
    expect(workbook.SheetNames).toEqual(['经营汇总', '每日趋势', '商品排行', '库存分析', '采购分析', '售后分析', '滞销商品']);
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['商品排行']);
    expect(rows[0]).toMatchObject({ 商品: '恐龙积木', 净销售额: 80, 毛利润: 50 });
  });

  it('does not invent owner-only columns for staff exports', () => {
    const staff = structuredClone(baseReport);
    staff.role = 'staff';
    delete staff.summary.netCost;
    delete staff.summary.grossProfit;
    delete staff.products[0].netCost;
    delete staff.products[0].grossProfit;
    const workbook = buildReportWorkbook(staff);
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['经营汇总']);
    expect(rows[0]).not.toHaveProperty('净成本');
    expect(rows[0]).not.toHaveProperty('毛利润');
  });
});
