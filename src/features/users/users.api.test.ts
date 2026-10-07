import { describe, expect, it, vi } from 'vitest';
import { createStaff, listUsers, setUserStatus } from './users.api';

const mocks = vi.hoisted(() => ({ functions: { invoke: vi.fn() } }));
vi.mock('../../lib/supabase', () => ({ supabase: mocks }));

describe('users api', () => {
  it('uses_protected_edge_function_for_list_create_and_status', async () => {
    mocks.functions.invoke.mockResolvedValue({ data: { users: [{ id: 'u1', role: 'staff' }] }, error: null });
    await listUsers();
    await createStaff({ email: 'staff@example.com', name: '店员', password: 'testing123' });
    await setUserStatus('u1', 'disabled');
    expect(mocks.functions.invoke).toHaveBeenNthCalledWith(1, 'admin-users', { body: { action: 'list' } });
    expect(mocks.functions.invoke).toHaveBeenCalledWith('admin-users', { body: { action: 'set-status', id: 'u1', status: 'disabled' } });
  });
});
