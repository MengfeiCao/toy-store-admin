import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SalesOrderDetailPage } from './SalesOrderDetailPage';

const mocks = vi.hoisted(() => ({ getSalesOrder: vi.fn(), shipSalesOrder: vi.fn(), markSalesOrderPaid: vi.fn(), revertSalesOrderPayment: vi.fn() }));
vi.mock('./sales.api', () => mocks);

describe('SalesOrderDetailPage', () => {
  it('shows_shipment_for_pending_order_and_hides_cost_for_staff', async () => {
    mocks.getSalesOrder.mockResolvedValue({ id: 'o1', orderNo: 'XS-001', customerId: null, customerName: '散客', status: 'pending_shipment', totalAmount: 300, paymentStatus: 'unpaid', items: [{ productId: 'p1', productName: '恐龙积木', sku: 'DLJM-001', quantity: 3, unitPrice: 100 }] });
    render(<SalesOrderDetailPage orderId="o1" role="staff" />);
    expect(await screen.findByText('确认出库')).toBeInTheDocument();
    expect(screen.queryByText(/成本/)).not.toBeInTheDocument();
  });

  it('shows_payment_and_owner_revert_for_completed_paid_order', async () => {
    mocks.getSalesOrder.mockResolvedValue({ id: 'o1', orderNo: 'XS-001', customerId: null, customerName: '散客', status: 'completed', totalAmount: 300, paymentStatus: 'paid', paymentMethod: 'wechat', items: [] });
    render(<SalesOrderDetailPage orderId="o1" role="owner" />);
    expect(await screen.findByText('已收款')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '撤销收款' })).toBeInTheDocument();
    expect(screen.queryByText('标记已收款')).not.toBeInTheDocument();
  });

  it('keeps_retry_available_when_shipment_is_still_pending', async () => {
    mocks.getSalesOrder.mockResolvedValue({ id: 'o1', orderNo: 'XS-001', customerId: null, customerName: '散客', status: 'pending_shipment', totalAmount: 300, paymentStatus: 'unpaid', items: [] });
    mocks.shipSalesOrder.mockRejectedValue(new Error('网络暂时不可用，请稍后重试'));
    render(<SalesOrderDetailPage orderId="o1" role="staff" />);
    await screen.findByText('确认出库');
    screen.getByRole('button', { name: '确认出库' }).click();
    await waitFor(() => expect(screen.getByRole('button', { name: '确认出库' })).toBeEnabled());
  });
});
