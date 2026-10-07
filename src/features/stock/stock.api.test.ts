import { describe, expect, it, vi } from 'vitest';
import { getStockIn, listStockInHistory, listStockRecords } from './stock.api';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: mocks }));

describe('stock api', () => {
  it('returns_stock_in_detail', async () => {
    mocks.rpc.mockResolvedValue({ data: { id: 'in-1', status: 'draft', order_no: 'RK-001', items: [] }, error: null });

    await expect(getStockIn('in-1')).resolves.toMatchObject({ id: 'in-1', status: 'draft' });
  });

  it('lists_legacy_stock_in_history', async () => {
    mocks.rpc.mockResolvedValue({ data: [{ id: 'in-1', order_no: 'RK-001', status: 'posted', total_quantity: 2, created_at: '2026-01-01' }], error: null });
    await expect(listStockInHistory()).resolves.toMatchObject([{ orderNo: 'RK-001', totalQuantity: 2 }]);
    expect(mocks.rpc).toHaveBeenCalledWith('list_stock_in_history', { p_query: '', p_status: null, p_date: null });
  });

  it('maps_extended_stock_record_sources', async () => {
    mocks.rpc.mockResolvedValue({ data: [{ id: 'r1', product_id: 'p1', product_name: '积木', sku: 'J-1', quantity_delta: 2, source: 'purchase_receipt', source_order_no: 'DH-1', created_at: '2026-01-01' }], error: null });
    await expect(listStockRecords({ source: 'purchase_receipt' })).resolves.toMatchObject([{ source: 'purchase_receipt' }]);
  });
});
