import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupplierListPage } from './SupplierListPage';

const mocks = vi.hoisted(() => ({
  listSuppliers: vi.fn(),
  createSupplier: vi.fn(),
  updateSupplier: vi.fn(),
  setSupplierStatus: vi.fn(),
}));
vi.mock('./suppliers.api', () => mocks);

describe('SupplierListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listSuppliers.mockResolvedValue([]);
  });

  it('shows_search_empty_state_and_create_action', async () => {
    render(<SupplierListPage />);

    expect(screen.getByRole('searchbox', { name: '搜索供应商' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新增供应商' })).toBeInTheDocument();
    expect(await screen.findByText('暂无供应商')).toBeInTheDocument();
  });

  it('creates_supplier_and_disables_submit_while_saving', async () => {
    let finishSave: (() => void) | undefined;
    mocks.createSupplier.mockImplementation(() => new Promise<void>((resolve) => { finishSave = resolve; }));
    render(<SupplierListPage />);

    fireEvent.click(screen.getByRole('button', { name: '新增供应商' }));
    fireEvent.change(screen.getByLabelText('供应商名称'), { target: { value: '童趣贸易' } });
    fireEvent.click(screen.getByRole('button', { name: /保.*存/ }));

    expect(await screen.findByRole('button', { name: /保存中/ })).toBeDisabled();
    await waitFor(() => expect(finishSave).toBeTypeOf('function'));
    finishSave?.();
    await waitFor(() => expect(mocks.createSupplier).toHaveBeenCalledWith(expect.objectContaining({ name: '童趣贸易' })));
  });

  it('keeps_values_after_save_error_and_can_deactivate_supplier', async () => {
    mocks.listSuppliers.mockResolvedValue([{ id: 's1', name: '童趣贸易', contactName: '王姐', phone: '0013800', address: null, remark: null, status: 'active', createdAt: '2026-10-01' }]);
    mocks.updateSupplier.mockRejectedValue(new Error('保存失败'));
    mocks.setSupplierStatus.mockResolvedValue(undefined);
    render(<SupplierListPage />);

    expect(await screen.findByText('童趣贸易')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '编辑' }));
    fireEvent.change(screen.getByLabelText('联系人'), { target: { value: '李姐' } });
    fireEvent.click(screen.getByRole('button', { name: /保.*存/ }));

    expect(await screen.findByText('保存失败')).toBeInTheDocument();
    expect(screen.getByLabelText('联系人')).toHaveValue('李姐');

    fireEvent.click(screen.getByRole('button', { name: '停用' }));
    fireEvent.click(await screen.findByRole('button', { name: /确.*认/ }));
    await waitFor(() => expect(mocks.setSupplierStatus).toHaveBeenCalledWith('s1', 'inactive'));
  });
});
