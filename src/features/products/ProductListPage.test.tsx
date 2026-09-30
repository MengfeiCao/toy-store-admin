import { render, screen, waitFor } from '@testing-library/react';
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
    expect(screen.getByText('成本价')).toBeInTheDocument();
    expect(screen.getByText('¥60.00')).toBeInTheDocument();
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
});
