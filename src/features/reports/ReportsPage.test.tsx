import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ReportsPage } from './ReportsPage';

const mocks = vi.hoisted(() => ({ getBusinessReport: vi.fn(), exportReport: vi.fn() }));
vi.mock('./reports.api', () => ({ getBusinessReport: mocks.getBusinessReport }));
vi.mock('./report-export', () => ({ exportReport: mocks.exportReport }));
vi.mock('./ReportChart', () => ({ ReportChart: () => <div data-testid="report-chart" /> }));

const report = {
  role: 'owner', from: '2026-10-01', to: '2026-10-31',
  summary: { grossSales: 100, refundAmount: 20, netSales: 80, orderCount: 1, netCost: 30, grossProfit: 50 },
  daily: [{ date: '2026-10-01', grossSales: 100, refundAmount: 20, netSales: 80, orderCount: 1, netCost: 30, grossProfit: 50 }],
  products: [{ productId: 'p1', productName: '恐龙积木', sku: 'DLJM-1', quantity: 2, grossSales: 100, refundAmount: 20, netSales: 80, netCost: 30, grossProfit: 50 }],
  inventory: { totalQuantity: 8, lowStockCount: 1, damageQuantity: 0, inventoryValue: 120 },
  purchases: { purchaseAmount: 60, receivedQuantity: 3, paidAmount: 60, unpaidAmount: 0 },
  afterSales: { returnQuantity: 1, exchangeQuantity: 0, damageQuantity: 0, refundAmount: 20 },
  slowMoving: [],
};

describe('ReportsPage', () => {
  it('shows all report views and exports the loaded result', async () => {
    mocks.getBusinessReport.mockResolvedValue(report);
    render(<ReportsPage />);

    expect((await screen.findAllByText('净销售额')).length).toBeGreaterThan(0);
    expect(screen.getByText('80')).toBeInTheDocument();
    expect(screen.getByTestId('report-chart')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '商品排行' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '库存分析' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '采购分析' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '售后分析' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '导出 Excel' }));
    expect(mocks.exportReport).toHaveBeenCalledWith(report);
  });
});
