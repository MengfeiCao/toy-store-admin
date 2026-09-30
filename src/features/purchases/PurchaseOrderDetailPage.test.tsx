import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PurchaseOrderDetailPage } from './PurchaseOrderDetailPage';

const mocks = vi.hoisted(() => ({ getPurchaseOrder: vi.fn(), cancelPurchaseOrder: vi.fn(), markPurchaseOrderPaid: vi.fn(), postPurchaseReceipt: vi.fn() }));
vi.mock('./purchases.api', () => mocks);

describe('PurchaseOrderDetailPage', () => {
  it('shows_status_items_and_cancel_action', async () => {
    mocks.getPurchaseOrder.mockResolvedValue({ id: 'o1', orderNo: 'CG-001', supplierId: 's1', supplierName: '童趣贸易', status: 'confirmed', totalAmount: 25, paymentStatus: 'unpaid', items: [{ id: 'i1', productId: 'p1', productName: '积木', sku: 'J-1', quantity: 2, receivedQuantity: 0, unitCost: 12.5, amount: 25 }] });
    mocks.cancelPurchaseOrder.mockResolvedValue(undefined);
    render(<PurchaseOrderDetailPage orderId="o1" />);

    expect(await screen.findByText('CG-001')).toBeInTheDocument();
    expect(screen.getByText('已确认')).toBeInTheDocument();
    expect(screen.getByText('¥12.50')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '取消采购单' }));
    fireEvent.click(await screen.findByRole('button', { name: /确.*认/ }));
    await waitFor(() => expect(mocks.cancelPurchaseOrder).toHaveBeenCalledWith('o1'));
  });

  it('opens_receiving_and_marks_the_order_paid_with_a_stable_request', async () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('51000000-0000-4000-8000-000000000001');
    mocks.getPurchaseOrder.mockResolvedValue({ id: 'o1', orderNo: 'CG-001', supplierId: 's1', supplierName: '童趣贸易', status: 'confirmed', totalAmount: 25, paymentStatus: 'unpaid', items: [{ id: 'i1', productId: 'p1', productName: '积木', sku: 'J-1', quantity: 2, receivedQuantity: 0, unitCost: 12.5, amount: 25 }] });
    mocks.markPurchaseOrderPaid.mockResolvedValue('51000000-0000-4000-8000-000000000001');
    render(<PurchaseOrderDetailPage orderId="o1" />);

    expect(await screen.findByRole('button', { name: '登记到货' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '标记已付款' }));
    fireEvent.click(await screen.findByRole('button', { name: /确.*认/ }));

    await waitFor(() => expect(mocks.markPurchaseOrderPaid).toHaveBeenCalledWith('o1', '51000000-0000-4000-8000-000000000001'));
  });
});
