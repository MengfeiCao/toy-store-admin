import { describe, expect, it, vi } from 'vitest';
import { confirmStockCount, createStockCount, listInventory, postStockAdjustment } from './inventory.api';
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: mocks }));
describe('inventory api', () => {
  it('lists_inventory_without_cost_fields', async () => { mocks.rpc.mockResolvedValue({ data: [{ id: 'p1', sku: 'J-1', name: '积木', category: '积木', stock_qty: 2, low_stock_threshold: 3, status: 'active' }], error: null }); const rows = await listInventory('', false); expect(rows[0]).toEqual(expect.objectContaining({ stockQty: 2 })); expect(rows[0]).not.toHaveProperty('costPrice'); });
  it('uses_fixed_request_ids_for_confirmation_and_adjustment', async () => { mocks.rpc.mockResolvedValue({ data: 'r1', error: null }); await createStockCount('月度'); await confirmStockCount('c1', 'r1'); await postStockAdjustment({ requestId: 'r2', type: 'shortage', reason: '破损', items: [{ productId: 'p1', quantityDelta: -1 }] }); expect(mocks.rpc).toHaveBeenCalledWith('confirm_stock_count', { p_stock_count_id: 'c1', p_request_id: 'r1' }); expect(mocks.rpc).toHaveBeenCalledWith('post_stock_adjustment', expect.objectContaining({ p_request_id: 'r2' })); });
});
