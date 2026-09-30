import { describe, expect, it, vi } from 'vitest';
import { getDashboard, listLowStockProducts } from './dashboard.api';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: mocks }));

describe('dashboard api', () => {
  it('keeps_owner_profit_fields_and_maps_low_stock_rows', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { role: 'owner', salesAmount: 300, costAmount: 180, grossProfit: 120, orderCount: 1 }, error: null }).mockResolvedValueOnce({ data: [{ id: 'p1', sku: 'DLJM-001', name: '恐龙积木', stock_qty: 2, low_stock_threshold: 3 }], error: null });
    const dashboard = await getDashboard({ from: '2026-09-01', to: '2026-09-30' });
    const lowStock = await listLowStockProducts();
    expect(dashboard).toMatchObject({ salesAmount: 300, costAmount: 180, grossProfit: 120 });
    expect(lowStock[0].stockQty).toBe(2);
  });

  it('preserves_staff_response_without_profit_keys', async () => {
    mocks.rpc.mockResolvedValue({ data: { role: 'staff', salesAmount: 300, orderCount: 1, pendingShipmentCount: 2 }, error: null });
    const result = await getDashboard({ from: '2026-09-01', to: '2026-09-30' });
    expect(result).not.toHaveProperty('costAmount');
    expect(result).not.toHaveProperty('grossProfit');
  });
});
