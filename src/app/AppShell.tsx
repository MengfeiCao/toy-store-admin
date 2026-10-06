import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

const navGroups = [
  { label: '经营', items: [{ to: '/dashboard', label: '经营概览' }, { to: '/reports', label: '经营报表' }] },
  { label: '商品与库存', items: [
    { to: '/products', label: '玩具管理' },
    { to: '/inventory', label: '当前库存' },
    { to: '/stock-alerts', label: '库存预警' },
    { to: '/stock-counts', label: '库存盘点' },
    { to: '/stock-adjustments', label: '库存调整' },
    { to: '/records', label: '库存流水' },
    { to: '/stock-in', label: '历史手工入库' },
  ] },
  { label: '采购', items: [
    { to: '/suppliers', label: '供应商' },
    { to: '/purchases', label: '采购单' },
    { to: '/purchase-receipts', label: '采购到货' },
  ] },
  { label: '销售', items: [
    { to: '/quick-sale', label: '扫码开单' },
    { to: '/customers', label: '客户管理' },
    { to: '/sales', label: '销售订单' },
    { to: '/after-sales', label: '售后管理' },
  ] },
];

export function AppShell() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const groups = profile?.role === 'owner'
    ? [...navGroups, { label: '系统', items: [{ to: '/users', label: '用户管理' }] }]
    : navGroups;

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">乐</span><span>乐奇玩具</span></div>
        <p className="sidebar-caption">玩具销售后台</p>
        <nav className="sidebar-nav" aria-label="主导航">
          {groups.map((group) => <div className="sidebar-group" key={group.label}><p className="sidebar-group-title">{group.label}</p>{group.items.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{item.label}</NavLink>)}</div>)}
        </nav>
        <div className="account-summary"><strong>{profile?.name}</strong><span>{profile?.role === 'owner' ? '店主' : '店员'}</span><button type="button" onClick={handleSignOut}>退出登录</button></div>
      </aside>
      <main className="app-content"><Outlet /></main>
    </div>
  );
}
