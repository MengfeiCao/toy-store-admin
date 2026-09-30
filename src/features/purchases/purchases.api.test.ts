import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cancelPurchaseOrder, confirmPurchaseOrder, getPurchaseOrder, listPurchaseOrders, savePurchaseOrderDraft } from './purchases.api';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: mocks }));

describe('purchases api', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes_list_filters_and_maps_amounts', async () => {
    mocks.rpc.mockResolvedValue({ data: [{ id: 'o1', order_no: 'CG-001', supplier_name: '童趣贸易', status: 'draft', total_amount: '25.50', payment_status: 'unpaid', created_at: '2026-10-01' }], error: null });

    const result = await listPurchaseOrders({ query: 'CG', supplierId: 's1', status: 'draft', paymentStatus: 'unpaid', date: '2026-10-01' });

    expect(mocks.rpc).toHaveBeenCalledWith('list_purchase_orders', { p_query: 'CG', p_supplier_id: 's1', p_status: 'draft', p_payment_status: 'unpaid', p_date: '2026-10-01' });
    expect(result[0].totalAmount).toBe(25.5);
  });

  it('saves_draft_with_only_product_quantity_and_unit_cost', async () => {
    mocks.rpc.mockResolvedValue({ data: 'o1', error: null });

    await savePurchaseOrderDraft({ supplierId: 's1', remark: '采购', items: [{ productId: 'p1', quantity: 2, unitCost: 12.5 }] });

    expect(mocks.rpc).toHaveBeenCalledWith('save_purchase_order_draft', { p_order_id: null, p_supplier_id: 's1', p_remark: '采购', p_items: [{ productId: 'p1', quantity: 2, unitCost: 12.5 }] });
  });

  it('loads_confirms_and_cancels_purchase_order', async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: { id: 'o1', orderNo: 'CG-001', items: [] }, error: null })
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: null });

    await expect(getPurchaseOrder('o1')).resolves.toMatchObject({ orderNo: 'CG-001' });
    await confirmPurchaseOrder('o1');
    await cancelPurchaseOrder('o1');

    expect(mocks.rpc).toHaveBeenNthCalledWith(2, 'confirm_purchase_order', { p_order_id: 'o1' });
    expect(mocks.rpc).toHaveBeenNthCalledWith(3, 'cancel_purchase_order', { p_order_id: 'o1' });
  });
});
