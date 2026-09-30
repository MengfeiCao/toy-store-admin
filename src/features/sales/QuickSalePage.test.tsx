import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuickSalePage } from './QuickSalePage';

const mocks = vi.hoisted(() => ({ getProductByBarcode: vi.fn(), listCustomers: vi.fn(), saveSalesOrder: vi.fn() }));
vi.mock('../products/products.api', () => ({ getProductByBarcode: mocks.getProductByBarcode }));
vi.mock('../customers/customers.api', () => ({ listCustomers: mocks.listCustomers }));
vi.mock('./sales.api', () => ({ saveSalesOrder: mocks.saveSalesOrder }));

function renderPage() { return render(<MemoryRouter><QuickSalePage /></MemoryRouter>); }

describe('QuickSalePage', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.listCustomers.mockResolvedValue([]); });

  it('focuses_the_scanner_and_accumulates_duplicate_scans', async () => {
    mocks.getProductByBarcode.mockResolvedValue({ id: 'p1', sku: 'J-1', barcode: '690001', name: '积木', salePrice: 20, stockQty: 2 });
    renderPage();
    const input = screen.getByRole('textbox', { name: '扫描商品条码' });
    await waitFor(() => expect(input).toHaveFocus());
    await userEvent.type(input, '690001{enter}');
    await screen.findByText('积木');
    await userEvent.type(input, '690001{enter}');
    expect(await screen.findByText('2')).toBeInTheDocument();
    expect(screen.getByText('合计 ¥40.00')).toBeInTheDocument();
  });

  it('shows_unknown_barcode_and_stock_limit_errors', async () => {
    mocks.getProductByBarcode.mockResolvedValueOnce(null).mockResolvedValue({ id: 'p1', sku: 'J-1', barcode: '690001', name: '积木', salePrice: 20, stockQty: 1 });
    renderPage();
    const input = screen.getByRole('textbox', { name: '扫描商品条码' });
    await userEvent.type(input, 'none{enter}');
    expect(await screen.findByText('未找到该条码对应的启用商品')).toBeInTheDocument();
    await userEvent.type(input, '690001{enter}');
    await screen.findByText('积木');
    await userEvent.type(input, '690001{enter}');
    expect(await screen.findByText('库存不足，积木当前仅有 1 件')).toBeInTheDocument();
  });

  it('reuses_the_sales_order_api_for_direct_confirmation', async () => {
    mocks.getProductByBarcode.mockResolvedValue({ id: 'p1', sku: 'J-1', barcode: '690001', name: '积木', salePrice: 20, stockQty: 2 });
    mocks.saveSalesOrder.mockResolvedValue('o1');
    renderPage();
    const input = screen.getByRole('textbox', { name: '扫描商品条码' });
    await userEvent.type(input, '690001{enter}');
    await screen.findByText('积木');
    await userEvent.click(screen.getByRole('button', { name: '确认订单' }));
    await waitFor(() => expect(mocks.saveSalesOrder).toHaveBeenCalledWith({ customerId: null, items: [{ productId: 'p1', quantity: 1 }], confirm: true }));
  });
});
