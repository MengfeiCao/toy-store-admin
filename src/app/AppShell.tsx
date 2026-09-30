import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

const navItems = [
  { to: '/dashboard', label: '经营概览' },
  { to: '/products', label: '玩具管理' },
  { to: '/stock-in', label: '入库单' },
  { to: '/records', label: '库存流水' },
  { to: '/customers', label: '客户管理' },
  { to: '/sales', label: '销售订单' },
];

export function AppShell() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const items = profile?.role === 'owner' ? [...navItems, { to: '/users', label: '用户管理' }] : navItems;

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">乐</span><span>乐奇玩具</span></div>
        <p className="sidebar-caption">玩具销售后台</p>
        <nav aria-label="主导航">
          {items.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{item.label}</NavLink>)}
        </nav>
        <div className="account-summary"><strong>{profile?.name}</strong><span>{profile?.role === 'owner' ? '店主' : '店员'}</span><button type="button" onClick={handleSignOut}>退出登录</button></div>
      </aside>
      <main className="app-content"><Outlet /></main>
    </div>
  );
}
