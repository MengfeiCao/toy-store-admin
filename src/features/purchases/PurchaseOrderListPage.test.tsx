import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PurchaseOrderListPage } from './PurchaseOrderListPage';

const mocks = vi.hoisted(() => ({ listPurchaseOrders: vi.fn(), cancelPurchaseOrder: vi.fn(), listSuppliers: vi.fn() }));
vi.mock('./purchases.api', () => ({ listPurchaseOrders: mocks.listPurchaseOrders, cancelPurchaseOrder: mocks.cancelPurchaseOrder }));
vi.mock('../suppliers/suppliers.api', () => ({ listSuppliers: mocks.listSuppliers }));

describe('PurchaseOrderListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listSuppliers.mockResolvedValue([{ id: 's1', name: '童趣贸易', status: 'active' }]);
    mocks.listPurchaseOrders.mockResolvedValue([{ id: 'o1', orderNo: 'CG-001', supplierName: '童趣贸易', status: 'draft', totalAmount: 25, paymentStatus: 'unpaid', createdAt: '2026-10-01' }]);
  });

  it('shows_filters_order_and_new_action', async () => {
    render(<MemoryRouter><PurchaseOrderListPage /></MemoryRouter>);

    expect(await screen.findByText('CG-001')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '新建采购单' })).toHaveAttribute('href', '/purchases/new');
    expect(screen.getByRole('combobox', { name: '采购状态' })).toBeInTheDocument();
    expect(screen.getByText('¥25.00')).toBeInTheDocument();
  });

  it('cancels_a_draft_after_confirmation', async () => {
    mocks.cancelPurchaseOrder.mockResolvedValue(undefined);
    render(<MemoryRouter><PurchaseOrderListPage /></MemoryRouter>);
    await screen.findByText('CG-001');

    fireEvent.click(screen.getByRole('button', { name: '取消采购单' }));
    fireEvent.click(await screen.findByRole('button', { name: /确.*认/ }));

    await waitFor(() => expect(mocks.cancelPurchaseOrder).toHaveBeenCalledWith('o1'));
  });
});
