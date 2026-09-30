import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SalesOrderEditPage } from './SalesOrderEditPage';

const mocks = vi.hoisted(() => ({ listProducts: vi.fn(), listCustomers: vi.fn(), saveSalesOrder: vi.fn(), getSalesOrder: vi.fn() }));
vi.mock('../products/products.api', () => ({ listProducts: mocks.listProducts }));
vi.mock('../customers/customers.api', () => ({ listCustomers: mocks.listCustomers }));
vi.mock('./sales.api', () => ({ saveSalesOrder: mocks.saveSalesOrder, getSalesOrder: mocks.getSalesOrder }));

function renderPage() {
  return render(<MemoryRouter><SalesOrderEditPage /></MemoryRouter>);
}

describe('SalesOrderEditPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows_readonly_price_actions_and_calculates_total', async () => {
    mocks.listProducts.mockResolvedValue([{ id: 'p1', name: '积木', sku: 'J-1', salePrice: 100, stockQty: 10, status: 'active' }, { id: 'p2', name: '小车', sku: 'C-1', salePrice: 100, stockQty: 10, status: 'active' }]);
    mocks.listCustomers.mockResolvedValue([]);
    mocks.saveSalesOrder.mockResolvedValue('o1');
    renderPage();

    expect(await screen.findByText('新建销售订单')).toBeInTheDocument();
    expect(screen.getByText('保存草稿')).toBeInTheDocument();
    expect(screen.getByText('确认订单')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '添加玩具' }));
    await userEvent.click(screen.getByRole('combobox', { name: '选择玩具' }));
    await userEvent.click(screen.getByRole('option', { name: '小车 · 100.00 元' }));
    fireEvent.click(screen.getByRole('button', { name: '添加玩具' }));
    expect(screen.getByText('合计 ¥200.00')).toBeInTheDocument();
    expect(screen.getAllByLabelText('售价')[0]).toHaveAttribute('readonly');
  });

  it('direct_confirmation_does_not_save_draft_first', async () => {
    mocks.listProducts.mockResolvedValue([{ id: 'p1', name: '积木', sku: 'J-1', salePrice: 100, stockQty: 10, status: 'active' }]);
    mocks.listCustomers.mockResolvedValue([]);
    mocks.saveSalesOrder.mockResolvedValue('o1');
    renderPage();
    await screen.findByText('新建销售订单');
    fireEvent.click(screen.getByRole('button', { name: '添加玩具' }));
    fireEvent.click(screen.getByRole('button', { name: '确认订单' }));
    await waitFor(() => expect(mocks.saveSalesOrder).toHaveBeenCalledWith(expect.objectContaining({ confirm: true })));
    expect(mocks.saveSalesOrder.mock.calls[0][0].confirm).toBe(true);
  });

  it('confirms_the_same_order_after_saving_a_draft', async () => {
    mocks.listProducts.mockResolvedValue([{ id: 'p1', name: '积木', sku: 'J-1', salePrice: 100, stockQty: 10, status: 'active' }]);
    mocks.listCustomers.mockResolvedValue([]);
    mocks.saveSalesOrder.mockResolvedValue('draft-1');
    renderPage();
    await screen.findByText('新建销售订单');
    fireEvent.click(screen.getByRole('button', { name: '添加玩具' }));
    fireEvent.click(screen.getByRole('button', { name: '保存草稿' }));
    await waitFor(() => expect(mocks.saveSalesOrder).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: '确认订单' }));

    await waitFor(() => expect(mocks.saveSalesOrder).toHaveBeenCalledTimes(2));
    expect(mocks.saveSalesOrder.mock.calls[1][0]).toEqual(expect.objectContaining({ id: 'draft-1', confirm: true }));
  });
});
