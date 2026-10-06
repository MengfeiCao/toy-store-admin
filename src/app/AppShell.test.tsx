import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';

vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({
    profile: { name: '测试店主', role: 'owner' },
    signOut: vi.fn(),
  }),
}));

describe('AppShell', () => {
  it('keeps navigation groups and links in separate layout containers', () => {
    render(<MemoryRouter initialEntries={['/dashboard']}><AppShell /></MemoryRouter>);

    expect(screen.getByRole('navigation', { name: '主导航' })).toHaveClass('sidebar-nav');
    expect(screen.getByText('商品与库存')).toHaveClass('sidebar-group-title');
    expect(screen.getByRole('link', { name: '玩具管理' })).toHaveClass('nav-link');
    expect(screen.queryByRole('link', { name: '当前库存' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '库存预警' })).not.toBeInTheDocument();
  });
});
