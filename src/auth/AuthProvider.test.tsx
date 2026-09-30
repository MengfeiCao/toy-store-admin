import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthProvider';

const mocks = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  },
  from: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({ supabase: mocks }));

function Probe() {
  const { profile, error, loading } = useAuth();
  return <div>{loading ? '加载中' : error ?? profile?.name ?? '未登录'}</div>;
}

describe('AuthProvider', () => {
  it('rejects_disabled_users', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'staff-1' } } }, error: null });
    mocks.from.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'staff-1', name: '店员', role: 'staff', status: 'disabled' }, error: null }) }) }),
    });

    render(<AuthProvider><Probe /></AuthProvider>);

    expect(await screen.findByText('账号已停用')).toBeInTheDocument();
    await waitFor(() => expect(mocks.auth.signOut).toHaveBeenCalled());
  });
});
