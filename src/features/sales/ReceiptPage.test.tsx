import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ReceiptPage } from './ReceiptPage';

const mocks = vi.hoisted(() => ({ getSalesOrder: vi.fn() }));
vi.mock('./sales.api', () => ({ getSalesOrder: mocks.getSalesOrder }));

describe('ReceiptPage', () => {
  it('renders_a_complete_80mm_receipt_and_prints_without_changing_the_order', async () => {
    mocks.getSalesOrder.mockResolvedValue({ id: 'o1', orderNo: 'XS-001', customerId: null, customerName: '散客', status: 'completed', totalAmount: 40, paymentStatus: 'paid', paymentMethod: 'cash', shippedAt: '2026-10-01T02:00:00Z', items: [{ id: 'i1', productId: 'p1', productName: '积木', sku: 'J-1', quantity: 2, unitPrice: 20 }] });
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    render(<ReceiptPage orderId="o1" />);
    expect(await screen.findByText('乐奇玩具')).toBeInTheDocument();
    expect(screen.getByText('XS-001')).toBeInTheDocument();
    expect(screen.getByText(/付款方式：现金/)).toBeInTheDocument();
    expect(screen.getAllByText('¥40.00').length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: '打印小票' }));
    expect(print).toHaveBeenCalledOnce();
  });
});
