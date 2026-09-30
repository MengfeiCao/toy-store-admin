import { describe, expect, it, vi } from 'vitest';
import { cancelSalesOrder, getSalesOrder, listSalesOrders, saveSalesOrder } from './sales.api';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: mocks }));

describe('sales api', () => {
  it('submits_only_product_ids_and_quantities_and_supports_direct_confirmation', async () => {
    mocks.rpc.mockResolvedValue({ data: 'order-1', error: null });

    await saveSalesOrder({ customerId: null, remark: '散客', items: [{ productId: 'p1', quantity: 3 }], confirm: true });

    expect(mocks.rpc).toHaveBeenCalledWith('save_sales_order', { p_order_id: null, p_customer_id: null, p_remark: '散客', p_items: [{ productId: 'p1', quantity: 3 }], p_confirm: true });
  });

  it('maps_order_detail_and_list_rows', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { id: 'o1', orderNo: 'XS-001', customerId: null, customerName: '散客', status: 'draft', totalAmount: 300, paymentStatus: 'unpaid', items: [{ productId: 'p1', productName: '积木', sku: 'J-1', quantity: 3, unitPrice: 100 }] }, error: null }).mockResolvedValueOnce({ data: [{ id: 'o1', order_no: 'XS-001', customer_name: null, status: 'pending_shipment', total_amount: 300, payment_status: 'unpaid', created_at: '2026-09-30' }], error: null });

    const detail = await getSalesOrder('o1');
    const rows = await listSalesOrders({ status: 'all' });
    expect(detail.totalAmount).toBe(300);
    expect(rows[0].orderNo).toBe('XS-001');
  });

  it('cancels_an_order', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    await cancelSalesOrder('o1');
    expect(mocks.rpc).toHaveBeenCalledWith('cancel_sales_order', { p_order_id: 'o1' });
  });
});
