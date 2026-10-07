import { describe, expect, it, vi } from 'vitest';
import { deleteCustomer, listCustomers, saveCustomer, toCustomerOptions } from './customers.api';

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: mocks }));

describe('customers api', () => {
  it('searches_by_name_or_phone_and_keeps_phone_as_text', async () => {
    const request = { select: vi.fn(), order: vi.fn(), or: vi.fn() };
    request.select.mockReturnValue(request);
    request.order.mockReturnValue(request);
    request.or.mockResolvedValue({ data: [{ id: 'c1', name: '小明妈妈', phone: '0013800123456', address: null, remark: null }], error: null });
    mocks.from.mockReturnValue(request);

    const result = await listCustomers('0013800');

    expect(request.or).toHaveBeenCalledWith('name.ilike.%0013800%,phone.ilike.%0013800%');
    expect(result[0].phone).toBe('0013800123456');
  });

  it('saves_customer_name_and_phone_as_text', async () => {
    const request = { insert: vi.fn(), select: vi.fn(), single: vi.fn() };
    request.insert.mockReturnValue(request);
    request.select.mockReturnValue(request);
    request.single.mockResolvedValue({ data: { id: 'c1' }, error: null });
    mocks.from.mockReturnValue(request);

    await saveCustomer({ name: ' 小明妈妈 ', phone: '0013800123456' });

    expect(request.insert).toHaveBeenCalledWith({ name: '小明妈妈', phone: '0013800123456', address: null, remark: null });
  });

  it('exports_walk_in_as_null_and_maps_foreign_key_delete_error', async () => {
    expect(toCustomerOptions([])[0]).toEqual({ id: null, label: '散客' });
    const request = { delete: vi.fn(), eq: vi.fn() };
    request.delete.mockReturnValue(request);
    request.eq.mockResolvedValue({ error: { code: '23503', message: 'violates foreign key constraint' } });
    mocks.from.mockReturnValue(request);

    await expect(deleteCustomer('c1')).rejects.toThrow('已有订单，不能删除');
  });
});
