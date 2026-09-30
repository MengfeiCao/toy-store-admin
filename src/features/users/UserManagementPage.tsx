import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { createStaff, listUsers, setUserStatus } from './users.api';
import type { ManagedUser } from './users.types';

export function UserManagementPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { try { setUsers(await listUsers()); } catch (cause) { setError(cause instanceof Error ? cause.message : '用户加载失败'); } }, []);
  useEffect(() => { if (profile?.role === 'owner') void load(); }, [profile, load]);
  if (profile?.role !== 'owner') return <div className="route-state" role="alert">无权限</div>;
  async function submit() { if (!form.email.trim() || !form.name.trim() || !form.password) { setError('请填写邮箱、姓名和密码'); return; } try { await createStaff(form); setForm({ email: '', name: '', password: '' }); setOpen(false); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : '创建失败'); } }
  async function toggle(user: ManagedUser) { try { await setUserStatus(user.id, user.status === 'active' ? 'disabled' : 'active'); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : '更新失败'); } }
  return <section className="feature-page"><div className="screen-head"><div><p className="eyebrow">系统管理</p><h1>用户管理</h1><p>仅店主可以创建店员和停用账号。</p></div><button className="btn-primary" type="button" onClick={() => { setOpen(true); setError(null); }}>新增店员</button></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="table-panel"><table><thead><tr><th>账号</th><th>姓名</th><th>角色</th><th>状态</th><th>操作</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td>{user.email}</td><td>{user.name}</td><td>{user.role === 'owner' ? '店主' : '店员'}</td><td>{user.status === 'active' ? '启用' : '停用'}</td><td><button className="text-button" type="button" disabled={user.id === profile.id && user.role === 'owner'} onClick={() => void toggle(user)}>{user.status === 'active' ? '停用' : '启用'}</button></td></tr>)}</tbody></table></div>{open && <div className="drawer-backdrop" role="presentation"><section className="product-drawer" role="dialog" aria-modal="true"><div className="drawer-header"><div><p className="eyebrow">账号管理</p><h2>新增店员</h2></div><button className="drawer-close" type="button" onClick={() => setOpen(false)}>关闭</button></div><form className="product-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}><label>邮箱<input aria-label="邮箱" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required /></label><label>姓名<input aria-label="姓名" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required /></label><label>密码<input aria-label="密码" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required /></label><div className="drawer-actions"><button className="btn-secondary" type="button" onClick={() => setOpen(false)}>取消</button><button className="btn-primary" type="submit">保存</button></div></form></section></div>}</section>;
}
