import { describe, expect, it, vi } from 'vitest';
import { getBusinessReport } from './reports.api';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: mocks }));

describe('reports api', () => {
  it('requests one report payload for the selected date range', async () => {
    const report = { role: 'owner', summary: { grossSales: 100 }, slowMoving: [{ id: 'p1', sku: 'SLOW-1', name: '慢销玩具', stock_qty: 2, last_sold_at: null }] };
    mocks.rpc.mockResolvedValue({ data: report, error: null });

    await expect(getBusinessReport({ from: '2026-10-01', to: '2026-10-31' })).resolves.toMatchObject({ slowMoving: [{ stockQty: 2, lastSoldAt: null }] });
    expect(mocks.rpc).toHaveBeenCalledWith('get_business_report', { p_from: '2026-10-01', p_to: '2026-10-31' });
  });
});
