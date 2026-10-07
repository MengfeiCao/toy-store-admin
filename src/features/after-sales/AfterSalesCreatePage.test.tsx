import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AfterSalesCreatePage } from './AfterSalesCreatePage';

const mocks = vi.hoisted(() => ({ getSalesOrder: vi.fn(), postAfterSales: vi.fn(), navigate: vi.fn() }));
vi.mock('../sales/sales.api', () => ({ getSalesOrder: mocks.getSalesOrder }));
vi.mock('./after-sales.api', () => ({ postAfterSales: mocks.postAfterSales }));
vi.mock('react-router-dom', async (importOriginal) => ({ ...(await importOriginal<typeof import('react-router-dom')>()), useNavigate: () => mocks.navigate }));

describe('AfterSalesCreatePage', () => {
  it('submits_a_partial_return_using_the_original_price', async () => {
    mocks.getSalesOrder.mockResolvedValue({ id: 'so-1', orderNo: 'XS-1', status: 'completed', paymentStatus: 'paid', totalAmount: 100, netAmount: 100, refundedAmount: 0, customerName: '散客', customerId: null, items: [{ id: 'i-1', productId: 'p-1', productName: '积木', sku: 'J-1', quantity: 5, handledQuantity: 1, unitPrice: 20 }] });
    mocks.postAfterSales.mockResolvedValue('as-1');
    render(<MemoryRouter><AfterSalesCreatePage orderId="so-1" /></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText('售后数量-积木'), { target: { value: '2' } });
    expect(screen.getByText('预计退款 ¥40.00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '确认售后' }));
    await waitFor(() => expect(mocks.postAfterSales).toHaveBeenCalledWith(expect.objectContaining({ type: 'return', items: [{ salesOrderItemId: 'i-1', quantity: 2, condition: 'good' }] })));
  });
});
