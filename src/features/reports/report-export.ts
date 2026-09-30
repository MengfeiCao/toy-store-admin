import * as XLSX from 'xlsx';
import type { BusinessReport } from './reports.types';

function addSheet(workbook: XLSX.WorkBook, name: string, rows: Record<string, unknown>[]) {
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name);
}

export function buildReportWorkbook(report: BusinessReport): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  const owner = report.role === 'owner';
  addSheet(workbook, '经营汇总', [{
    开始日期: report.from, 结束日期: report.to, 销售额: report.summary.grossSales,
    退款金额: report.summary.refundAmount, 净销售额: report.summary.netSales, 订单数: report.summary.orderCount,
    ...(owner ? { 净成本: report.summary.netCost, 毛利润: report.summary.grossProfit } : {}),
  }]);
  addSheet(workbook, '每日趋势', report.daily.map((row) => ({
    日期: row.date, 销售额: row.grossSales, 退款金额: row.refundAmount, 净销售额: row.netSales, 订单数: row.orderCount,
    ...(owner ? { 净成本: row.netCost, 毛利润: row.grossProfit } : {}),
  })));
  addSheet(workbook, '商品排行', report.products.map((row) => ({
    商品: row.productName, SKU: row.sku, 销售数量: row.quantity, 销售额: row.grossSales,
    退款金额: row.refundAmount, 净销售额: row.netSales,
    ...(owner ? { 净成本: row.netCost, 毛利润: row.grossProfit } : {}),
  })));
  addSheet(workbook, '库存分析', [{ 总库存: report.inventory.totalQuantity, 低库存商品数: report.inventory.lowStockCount, 报损数量: report.inventory.damageQuantity, ...(owner ? { 库存成本: report.inventory.inventoryValue } : {}) }]);
  addSheet(workbook, '采购分析', [{ 采购金额: report.purchases.purchaseAmount, 到货数量: report.purchases.receivedQuantity, 付款金额: report.purchases.paidAmount, 当前未付金额: report.purchases.unpaidAmount }]);
  addSheet(workbook, '售后分析', [{ 退货数量: report.afterSales.returnQuantity, 换货数量: report.afterSales.exchangeQuantity, 损坏数量: report.afterSales.damageQuantity, 退款金额: report.afterSales.refundAmount }]);
  addSheet(workbook, '滞销商品', report.slowMoving.map((row) => ({ 商品: row.name, SKU: row.sku, 当前库存: row.stockQty, 最近销售时间: row.lastSoldAt ?? '从未销售' })));
  return workbook;
}

export function exportReport(report: BusinessReport) {
  XLSX.writeFile(buildReportWorkbook(report), `经营报表_${report.from}_${report.to}.xlsx`);
}
