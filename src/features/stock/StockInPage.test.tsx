import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StockInPage } from './StockInPage';

const mocks = vi.hoisted(() => ({
  saveStockInDraft: vi.fn(),
  postStockIn: vi.fn(),
  getStockIn: vi.fn(),
  listProducts: vi.fn(),
}));

vi.mock('./stock.api', () => mocks);
vi.mock('../products/products.api', () => ({ listProducts: mocks.listProducts }));

describe('StockInPage', () => {
  it('saves_a_draft_and_restores_the_saved_state', async () => {
    mocks.listProducts.mockResolvedValue([{ id: 'p1', name: '恐龙积木', sku: 'DLJM-001', stockQty: 0, salePrice: 100, costPrice: 60, category: '积木', status: 'active' }]);
    mocks.saveStockInDraft.mockResolvedValue('in-1');
    mocks.getStockIn.mockResolvedValue({ id: 'in-1', orderNo: 'RK-001', status: 'draft', items: [{ productId: 'p1', quantity: 10 }] });

    render(<StockInPage />);

    fireEvent.change(await screen.findByLabelText('入库数量'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: '保存草稿' }));

    await waitFor(() => expect(mocks.saveStockInDraft).toHaveBeenCalled());
    expect(await screen.findByText('草稿已保存')).toBeInTheDocument();
  });

  it('disables_confirm_while_posting', async () => {
    mocks.listProducts.mockResolvedValue([{ id: 'p1', name: '恐龙积木', sku: 'DLJM-001', stockQty: 0, salePrice: 100, costPrice: 60, category: '积木', status: 'active' }]);
    mocks.saveStockInDraft.mockResolvedValue('in-1');
    mocks.postStockIn.mockImplementation(() => new Promise(() => {}));

    render(<StockInPage />);
    fireEvent.click(await screen.findByRole('button', { name: '确认入库' }));
    expect(screen.getByRole('button', { name: '确认中…' })).toBeDisabled();
  });
});
