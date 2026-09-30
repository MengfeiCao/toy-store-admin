import { describe, expect, it, vi } from 'vitest';
import { listProducts } from './products.api';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: mocks }));

describe('products api', () => {
  it('hides_cost_price_when_the_database_returns_null_for_staff', async () => {
    mocks.rpc.mockResolvedValue({ data: [{ id: 'p1', name: '恐龙积木', sale_price: 100, cost_price: null, stock_qty: 7, status: 'active' }], error: null });

    const result = await listProducts({ query: '', status: 'all' });

    expect(result[0].costPrice).toBeNull();
    expect(mocks.rpc).toHaveBeenCalledWith('list_products', { p_query: '', p_status: null });
  });
});
