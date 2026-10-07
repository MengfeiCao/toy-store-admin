import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './AuthProvider';
import { ProtectedRoute } from './ProtectedRoute';

const mocks = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    signOut: vi.fn(),
  },
  from: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({ supabase: mocks }));

describe('ProtectedRoute', () => {
  it('redirects_anonymous_users_to_login', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

    render(<MemoryRouter initialEntries={['/dashboard']}><AuthProvider><Routes><Route path="/login" element={<div>登录</div>} /><Route path="/dashboard" element={<ProtectedRoute><div>首页</div></ProtectedRoute>} /></Routes></AuthProvider></MemoryRouter>);

    expect(await screen.findByText('登录')).toBeInTheDocument();
  });

  it('denies_staff_users_access_to_owner_routes', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'staff-1' } } }, error: null });
    mocks.from.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'staff-1', name: '店员', role: 'staff', status: 'active' }, error: null }) }) }),
    });

    render(<MemoryRouter initialEntries={['/users']}><AuthProvider><Routes><Route path="/users" element={<ProtectedRoute allow={['owner']}><div>用户管理</div></ProtectedRoute>} /></Routes></AuthProvider></MemoryRouter>);

    expect(await screen.findByText('无权限')).toBeInTheDocument();
  });
});
