import { describe, expect, it, vi } from 'vitest';
import { listAfterSales, postAfterSales } from './after-sales.api';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: mocks }));

describe('after-sales api', () => {
  it('posts_with_a_request_id_and_maps_list_rows', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: 'as-1', error: null });
    await postAfterSales({ requestId: 'as-1', salesOrderId: 'so-1', type: 'return', remark: '退货', items: [{ salesOrderItemId: 'i-1', quantity: 1, condition: 'good' }] });
    expect(mocks.rpc).toHaveBeenCalledWith('post_after_sales', expect.objectContaining({ p_request_id: 'as-1', p_type: 'return' }));

    mocks.rpc.mockResolvedValueOnce({ data: [{ id: 'as-1', after_sales_no: 'SH-1', sales_order_id: 'so-1', sales_order_no: 'XS-1', customer_name: '散客', type: 'return', total_quantity: 1, refund_amount: 20, completed_at: '2026-10-01' }], error: null });
    await expect(listAfterSales({})).resolves.toMatchObject([{ afterSalesNo: 'SH-1', refundAmount: 20 }]);
  });
});
