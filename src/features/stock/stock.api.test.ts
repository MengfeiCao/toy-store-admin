import { describe, expect, it, vi } from 'vitest';
import { getStockIn, postStockIn } from './stock.api';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: mocks }));

describe('stock api', () => {
  it('rechecks_document_after_an_unknown_post_result', async () => {
    mocks.rpc.mockImplementation((name: string) => {
      if (name === 'post_stock_in') return Promise.resolve({ data: null, error: new Error('network timeout') });
      return Promise.resolve({ data: { id: 'in-1', status: 'posted', order_no: 'RK-001', items: [] }, error: null });
    });

    await expect(postStockIn('in-1')).resolves.toBeUndefined();
    expect(mocks.rpc).toHaveBeenNthCalledWith(1, 'post_stock_in', { p_order_id: 'in-1' });
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, 'get_stock_in', { p_order_id: 'in-1' });
  });

  it('returns_stock_in_detail', async () => {
    mocks.rpc.mockResolvedValue({ data: { id: 'in-1', status: 'draft', order_no: 'RK-001', items: [] }, error: null });

    await expect(getStockIn('in-1')).resolves.toMatchObject({ id: 'in-1', status: 'draft' });
  });
});
