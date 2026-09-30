import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UserManagementPage } from './UserManagementPage';

const mocks = vi.hoisted(() => ({ useAuth: vi.fn(), listUsers: vi.fn(), createStaff: vi.fn(), setUserStatus: vi.fn() }));
vi.mock('../../auth/AuthProvider', () => ({ useAuth: mocks.useAuth }));
vi.mock('./users.api', () => ({ listUsers: mocks.listUsers, createStaff: mocks.createStaff, setUserStatus: mocks.setUserStatus }));

describe('UserManagementPage', () => {
  it('is_owner_only_and_cannot_disable_current_owner', async () => {
    mocks.useAuth.mockReturnValue({ profile: { id: 'u1', role: 'owner' } });
    mocks.listUsers.mockResolvedValue([{ id: 'u1', email: 'owner@example.com', name: '店主', role: 'owner', status: 'active', createdAt: '2026-09-30' }, { id: 'u2', email: 'staff@example.com', name: '店员', role: 'staff', status: 'active', createdAt: '2026-09-30' }]);
    render(<UserManagementPage />);
    expect(await screen.findByText('owner@example.com')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '停用' })[0]).toBeDisabled();
    expect(screen.getAllByRole('button', { name: '停用' })[1]).toBeEnabled();
  });

  it('validates_staff_form_and_refreshes_after_create', async () => {
    mocks.listUsers.mockClear();
    mocks.createStaff.mockClear();
    mocks.useAuth.mockReturnValue({ profile: { id: 'u1', role: 'owner' } });
    mocks.listUsers.mockResolvedValue([]);
    mocks.createStaff.mockResolvedValue('u2');
    render(<UserManagementPage />);
    fireEvent.click(await screen.findByRole('button', { name: '新增店员' }));
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    expect(mocks.createStaff).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'staff@example.com' } });
    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: '店员' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'testing123' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(mocks.createStaff).toHaveBeenCalled());
    expect(mocks.listUsers).toHaveBeenCalledTimes(2);
  });

  it('shows_forbidden_when_staff_opens_route', () => {
    mocks.useAuth.mockReturnValue({ profile: { id: 'u2', role: 'staff' } });
    render(<UserManagementPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('无权限');
  });
});
