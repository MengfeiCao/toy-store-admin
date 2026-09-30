import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './AuthProvider';
import { LoginPage } from './LoginPage';

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

describe('LoginPage', () => {
  it('navigates_to_dashboard_after_successful_login', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mocks.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: 'owner-1' }, session: { user: { id: 'owner-1' } } }, error: null });
    mocks.from.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'owner-1', name: '店主', role: 'owner', status: 'active' }, error: null }) }) }),
    });

    render(<MemoryRouter initialEntries={['/login']}><AuthProvider><Routes><Route path="/login" element={<LoginPage />} /><Route path="/dashboard" element={<div>首页</div>} /></Routes></AuthProvider></MemoryRouter>);

    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'owner@example.com' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: '登录' }));

    expect(await screen.findByText('首页')).toBeInTheDocument();
  });
});
