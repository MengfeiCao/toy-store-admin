import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProductListPage } from './ProductListPage';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  listProducts: vi.fn(),
  setProductStatus: vi.fn(),
}));

vi.mock('../../auth/AuthProvider', () => ({ useAuth: mocks.useAuth }));
vi.mock('./products.api', () => ({
  listProducts: mocks.listProducts,
  setProductStatus: mocks.setProductStatus,
}));

describe('ProductListPage', () => {
  it('shows_cost_and_create_action_for_owner', async () => {
    mocks.useAuth.mockReturnValue({ profile: { role: 'owner' } });
    mocks.listProducts.mockResolvedValue([{ id: 'p1', sku: 'DLJM-001', name: '恐龙积木', category: '积木', salePrice: 100, costPrice: 60, stockQty: 7, status: 'active' }]);

    render(<ProductListPage />);

    expect(await screen.findByText('新增玩具')).toBeInTheDocument();
    expect(await screen.findByText('¥60.00')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '成本价' })).toBeInTheDocument();
  });

  it('hides_cost_and_create_action_for_staff_and_keeps_stock_readonly', async () => {
    mocks.useAuth.mockReturnValue({ profile: { role: 'staff' } });
    mocks.listProducts.mockResolvedValue([{ id: 'p1', sku: 'DLJM-001', name: '恐龙积木', category: '积木', salePrice: 100, costPrice: null, stockQty: 7, status: 'active' }]);

    render(<ProductListPage />);

    await waitFor(() => expect(screen.getByText('恐龙积木')).toBeInTheDocument());
    expect(screen.queryByText('新增玩具')).not.toBeInTheDocument();
    expect(screen.queryByText('成本价')).not.toBeInTheDocument();
    expect(screen.getByText('7 件')).toBeInTheDocument();
  });

  it('filters_stock_status_from_the_table_header', async () => {
    const user = userEvent.setup();
    mocks.useAuth.mockReturnValue({ profile: { role: 'owner' } });
    mocks.listProducts.mockResolvedValue([
      { id: 'p1', sku: 'LOW-1', name: '低库存玩具', category: '积木', salePrice: 100, costPrice: 60, stockQty: 2, lowStockThreshold: 3, status: 'active' },
      { id: 'p2', sku: 'OK-1', name: '库存正常玩具', category: '积木', salePrice: 100, costPrice: 60, stockQty: 8, lowStockThreshold: 3, status: 'active' },
      { id: 'p3', sku: 'NONE-1', name: '未设置预警玩具', category: '积木', salePrice: 100, costPrice: 60, stockQty: 1, lowStockThreshold: null, status: 'active' },
    ]);

    render(<ProductListPage />);

    expect(await screen.findByText('低库存玩具')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '预警阈值' })).toBeInTheDocument();
    expect(screen.getByText('库存不足')).toBeInTheDocument();
    expect(screen.getByText('库存正常')).toBeInTheDocument();
    expect(screen.getByText('未设置预警')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '筛选库存状态' }));
    await user.click(screen.getByRole('menuitem', { name: '库存不足' }));
    await user.click(screen.getByRole('button', { name: 'OK' }));

    expect(screen.getByText('低库存玩具')).toBeInTheDocument();
    expect(screen.queryByText('库存正常玩具')).not.toBeInTheDocument();
    expect(screen.queryByText('未设置预警玩具')).not.toBeInTheDocument();
  });
});
