import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PurchaseReceiptDrawer } from './PurchaseReceiptDrawer';

const mocks = vi.hoisted(() => ({ postPurchaseReceipt: vi.fn() }));
vi.mock('./purchases.api', () => ({ postPurchaseReceipt: mocks.postPurchaseReceipt }));

const order = { id: 'o1', orderNo: 'CG-001', supplierId: 's1', supplierName: '童趣贸易', status: 'partially_received' as const, totalAmount: 80, paymentStatus: 'unpaid' as const, items: [{ id: 'i1', productId: 'p1', productName: '积木', sku: 'J-1', quantity: 10, receivedQuantity: 4, unitCost: 8, amount: 80 }] };

describe('PurchaseReceiptDrawer', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows_only_remaining_items_and_reuses_request_id_after_failure', async () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('41000000-0000-4000-8000-000000000001');
    mocks.postPurchaseReceipt.mockRejectedValueOnce(new Error('网络暂时不可用')).mockResolvedValueOnce('41000000-0000-4000-8000-000000000001');
    render(<PurchaseReceiptDrawer open order={order} onClose={vi.fn()} onSaved={vi.fn()} />);

    const quantity = screen.getByLabelText('本次到货-积木');
    expect(quantity).toHaveAttribute('aria-valuemax', '6');
    fireEvent.change(quantity, { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: '确认到货' }));
    expect(await screen.findByText('网络暂时不可用')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '确认到货' }));
    await waitFor(() => expect(mocks.postPurchaseReceipt).toHaveBeenCalledTimes(2));
    expect(mocks.postPurchaseReceipt.mock.calls[0][0].requestId).toBe(mocks.postPurchaseReceipt.mock.calls[1][0].requestId);
  });
});
