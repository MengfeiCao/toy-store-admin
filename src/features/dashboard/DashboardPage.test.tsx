import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './DashboardPage';

const mocks = vi.hoisted(() => ({ useAuth: vi.fn(), getDashboard: vi.fn(), listLowStockProducts: vi.fn() }));
vi.mock('../../auth/AuthProvider', () => ({ useAuth: mocks.useAuth }));
vi.mock('./dashboard.api', () => ({ getDashboard: mocks.getDashboard, listLowStockProducts: mocks.listLowStockProducts }));

describe('DashboardPage', () => {
  it('shows_owner_metrics_and_low_stock', async () => {
    mocks.useAuth.mockReturnValue({ profile: { role: 'owner' } });
    mocks.getDashboard.mockResolvedValue({ role: 'owner', salesAmount: 300, costAmount: 180, grossProfit: 120, orderCount: 1 });
    mocks.listLowStockProducts.mockResolvedValue([{ id: 'p1', sku: 'DLJM-001', name: '恐龙积木', stockQty: 2, lowStockThreshold: 3 }]);
    render(<DashboardPage />);
    expect(await screen.findByText('毛利润')).toBeInTheDocument();
    expect(screen.getByText('¥120.00')).toBeInTheDocument();
    expect(screen.getByText('恐龙积木')).toBeInTheDocument();
  });

  it('does_not_render_profit_for_staff', async () => {
    mocks.useAuth.mockReturnValue({ profile: { role: 'staff' } });
    mocks.getDashboard.mockResolvedValue({ role: 'staff', salesAmount: 300, orderCount: 1, pendingShipmentCount: 2 });
    mocks.listLowStockProducts.mockResolvedValue([]);
    render(<DashboardPage />);
    expect(await screen.findByText('待出库')).toBeInTheDocument();
    expect(screen.queryByText('成本')).not.toBeInTheDocument();
    expect(screen.queryByText('毛利润')).not.toBeInTheDocument();
  });
});
