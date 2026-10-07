import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupplier, listSuppliers, setSupplierStatus, updateSupplier } from './suppliers.api';

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: mocks }));

describe('suppliers api', () => {
  beforeEach(() => vi.clearAllMocks());

  it('searches_supplier_name_contact_and_phone', async () => {
    const request = { select: vi.fn(), order: vi.fn(), or: vi.fn() };
    request.select.mockReturnValue(request);
    request.order.mockReturnValue(request);
    request.or.mockResolvedValue({ data: [{ id: 's1', name: '童趣贸易', contact_name: '王姐', phone: '0013800', address: null, remark: null, status: 'active', created_at: '2026-10-01' }], error: null });
    mocks.from.mockReturnValue(request);

    const result = await listSuppliers({ query: ' 王姐 ', status: 'all' });

    expect(request.or).toHaveBeenCalledWith('name.ilike.%王姐%,contact_name.ilike.%王姐%,phone.ilike.%王姐%');
    expect(result[0]).toMatchObject({ name: '童趣贸易', contactName: '王姐', phone: '0013800' });
  });

  it('creates_and_updates_only_supported_supplier_fields', async () => {
    const insertRequest = { insert: vi.fn(), select: vi.fn(), single: vi.fn() };
    insertRequest.insert.mockReturnValue(insertRequest);
    insertRequest.select.mockReturnValue(insertRequest);
    insertRequest.single.mockResolvedValue({ data: { id: 's1' }, error: null });
    mocks.from.mockReturnValueOnce(insertRequest);

    await createSupplier({ name: ' 童趣贸易 ', contactName: ' 王姐 ', phone: ' 0013800 ', address: '', remark: '' });

    expect(insertRequest.insert).toHaveBeenCalledWith({ name: '童趣贸易', contact_name: '王姐', phone: '0013800', address: null, remark: null });

    const updateRequest = { update: vi.fn(), eq: vi.fn() };
    updateRequest.update.mockReturnValue(updateRequest);
    updateRequest.eq.mockResolvedValue({ error: null });
    mocks.from.mockReturnValueOnce(updateRequest);

    await updateSupplier('s1', { name: '新名称', contactName: '', phone: '', address: '', remark: '' });
    expect(updateRequest.eq).toHaveBeenCalledWith('id', 's1');
  });

  it('changes_supplier_status_without_delete', async () => {
    const request = { update: vi.fn(), eq: vi.fn() };
    request.update.mockReturnValue(request);
    request.eq.mockResolvedValue({ error: null });
    mocks.from.mockReturnValue(request);

    await setSupplierStatus('s1', 'inactive');

    expect(request.update).toHaveBeenCalledWith({ status: 'inactive' });
    expect(request.eq).toHaveBeenCalledWith('id', 's1');
  });
});
