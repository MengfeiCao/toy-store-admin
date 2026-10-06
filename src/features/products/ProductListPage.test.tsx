import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProductListPage } from './ProductListPage';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  listProducts: vi.fn(),
  setProductStatus: vi.fn(),
  getProductImageUrl: vi.fn(),
}));

vi.mock('../../auth/AuthProvider', () => ({ useAuth: mocks.useAuth }));
vi.mock('./products.api', () => ({
  listProducts: mocks.listProducts,
  setProductStatus: mocks.setProductStatus,
  getProductImageUrl: mocks.getProductImageUrl,
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

  it('shows_product_thumbnail_with_preview_and_no_image_placeholder', async () => {
    const user = userEvent.setup();
    mocks.useAuth.mockReturnValue({ profile: { role: 'owner' } });
    mocks.getProductImageUrl.mockReturnValue('https://example.com/dino.png');
    mocks.listProducts.mockResolvedValue([
      { id: 'p1', sku: 'DLJM-001', name: '恐龙积木', category: '积木', salePrice: 100, costPrice: 60, stockQty: 7, imagePath: 'dino.png', status: 'active' },
      { id: 'p2', sku: 'NO-IMAGE', name: '无图玩具', category: '积木', salePrice: 80, costPrice: 40, stockQty: 2, imagePath: null, status: 'active' },
    ]);

    render(<ProductListPage />);

    const thumbnail = await screen.findByRole('img', { name: '恐龙积木商品图片' });
    expect(thumbnail).toHaveAttribute('src', 'https://example.com/dino.png');
    expect(screen.getByText('无图')).toBeInTheDocument();

    await user.click(thumbnail);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('shows_no_image_placeholder_when_thumbnail_fails_to_load', async () => {
    mocks.useAuth.mockReturnValue({ profile: { role: 'owner' } });
    mocks.getProductImageUrl.mockReturnValue('https://example.com/missing.png');
    mocks.listProducts.mockResolvedValue([
      { id: 'p1', sku: 'BROKEN-IMAGE', name: '图片失效玩具', category: '积木', salePrice: 100, costPrice: 60, stockQty: 7, imagePath: 'missing.png', status: 'active' },
    ]);

    render(<ProductListPage />);

    const thumbnail = await screen.findByRole('img', { name: '图片失效玩具商品图片' });
    fireEvent.error(thumbnail);

    expect(await screen.findByText('无图')).toBeInTheDocument();
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

    const filterTrigger = document.querySelector<HTMLElement>('.ant-table-filter-trigger');
    expect(filterTrigger).toBeInTheDocument();
    expect(filterTrigger).not.toHaveTextContent('筛选');
    expect(filterTrigger?.querySelector('svg')).toBeInTheDocument();

    await user.click(filterTrigger!);
    await user.click(screen.getByRole('menuitem', { name: '库存不足' }));
    await user.click(screen.getByRole('button', { name: 'OK' }));

    expect(screen.getByText('低库存玩具')).toBeInTheDocument();
    expect(screen.queryByText('库存正常玩具')).not.toBeInTheDocument();
    expect(screen.queryByText('未设置预警玩具')).not.toBeInTheDocument();
  });
});
