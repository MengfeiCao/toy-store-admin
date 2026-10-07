import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Drawer, Form, Input, Space, Table, Tag } from 'antd';
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
  return <section className="feature-page"><div className="screen-head"><div><p className="eyebrow">系统管理</p><h1>用户管理</h1><p>仅店主可以创建店员和停用账号。</p></div><Button aria-label="新增店员" type="primary" onClick={() => { setOpen(true); setError(null); }}>新增店员</Button></div>{error && <Alert type="error" showIcon message={error} />}<Table rowKey="id" dataSource={users} pagination={false} columns={[
    { title: '账号', dataIndex: 'email' }, { title: '姓名', dataIndex: 'name' },
    { title: '角色', render: (_, user) => user.role === 'owner' ? '店主' : '店员' },
    { title: '状态', render: (_, user) => <Tag color={user.status === 'active' ? 'green' : 'default'}>{user.status === 'active' ? '启用' : '停用'}</Tag> },
    { title: '操作', render: (_, user) => <Button type="link" disabled={user.id === profile.id && user.role === 'owner'} onClick={() => void toggle(user)}>{user.status === 'active' ? '停用' : '启用'}</Button> },
  ]} /><Drawer title="新增店员" open={open} onClose={() => setOpen(false)} destroyOnHidden extra={<Space><Button onClick={() => setOpen(false)}>取消</Button><Button aria-label="保存" type="primary" onClick={() => void submit()}>保存</Button></Space>}><Form layout="vertical" onFinish={() => void submit()}><Form.Item label="邮箱" required><Input aria-label="邮箱" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></Form.Item><Form.Item label="姓名" required><Input aria-label="姓名" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></Form.Item><Form.Item label="密码" required><Input.Password aria-label="密码" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} /></Form.Item></Form></Drawer></section>;
}
