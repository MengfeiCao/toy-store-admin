import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PurchaseOrderEditPage } from './PurchaseOrderEditPage';

const mocks = vi.hoisted(() => ({ listProducts: vi.fn(), listSuppliers: vi.fn(), getPurchaseOrder: vi.fn(), savePurchaseOrderDraft: vi.fn(), confirmPurchaseOrder: vi.fn() }));
vi.mock('../products/products.api', () => ({ listProducts: mocks.listProducts }));
vi.mock('../suppliers/suppliers.api', () => ({ listSuppliers: mocks.listSuppliers }));
vi.mock('./purchases.api', () => ({ getPurchaseOrder: mocks.getPurchaseOrder, savePurchaseOrderDraft: mocks.savePurchaseOrderDraft, confirmPurchaseOrder: mocks.confirmPurchaseOrder }));

function renderPage() { return render(<MemoryRouter><PurchaseOrderEditPage /></MemoryRouter>); }

describe('PurchaseOrderEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listProducts.mockResolvedValue([
      { id: 'p1', name: '积木', sku: 'J-1', costPrice: 10, salePrice: 20, stockQty: 0, status: 'active' },
      { id: 'p2', name: '小车', sku: 'C-1', costPrice: 30, salePrice: 50, stockQty: 0, status: 'active' },
    ]);
    mocks.listSuppliers.mockResolvedValue([{ id: 's1', name: '童趣贸易', status: 'active' }]);
    mocks.savePurchaseOrderDraft.mockResolvedValue('o1');
    mocks.confirmPurchaseOrder.mockResolvedValue(undefined);
  });

  it('adds_and_removes_rows_and_calculates_amount', async () => {
    renderPage();
    await screen.findByText('新建采购单');

    fireEvent.click(screen.getByRole('button', { name: '添加商品' }));
    fireEvent.change(screen.getByLabelText('采购数量-积木'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('采购单价-积木'), { target: { value: '12.5' } });

    expect(screen.getByText('合计 ¥25.00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '移除积木' }));
    expect(screen.getByText('请添加商品')).toBeInTheDocument();
  });

  it('adds_the_first_available_product_and_allows_changing_it_in_the_row', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('新建采购单');

    expect(screen.queryByRole('combobox', { name: '选择商品' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '添加商品' }));

    const productSelect = screen.getByRole('combobox', { name: '采购商品-1' });
    expect(screen.getByLabelText('采购单价-积木')).toHaveValue('10.00');
    await user.click(productSelect);
    await user.click(await screen.findByText('小车 · C-1'));

    expect(screen.getByLabelText('采购单价-小车')).toHaveValue('30.00');
    expect(screen.getByText('合计 ¥30.00')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '添加商品' }));
    expect(screen.getByRole('combobox', { name: '采购商品-2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '添加商品' })).toBeDisabled();
  });

  it('saves_then_confirms_the_same_order', async () => {
    renderPage();
    await screen.findByText('新建采购单');
    fireEvent.click(screen.getByRole('button', { name: '添加商品' }));
    fireEvent.click(screen.getByRole('button', { name: '确认采购单' }));

    await waitFor(() => expect(mocks.savePurchaseOrderDraft).toHaveBeenCalled());
    expect(mocks.confirmPurchaseOrder).toHaveBeenCalledWith('o1');
  });

  it('keeps_rows_when_save_fails', async () => {
    mocks.savePurchaseOrderDraft.mockRejectedValue(new Error('保存失败'));
    renderPage();
    await screen.findByText('新建采购单');
    fireEvent.click(screen.getByRole('button', { name: '添加商品' }));
    fireEvent.click(screen.getByRole('button', { name: '保存草稿' }));

    expect(await screen.findByText('保存失败')).toBeInTheDocument();
    expect(screen.getByLabelText('采购数量-积木')).toHaveValue('1');
  });
});
