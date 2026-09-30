import { useCallback, useEffect, useState } from 'react';
import { CustomerDrawer } from './CustomerDrawer';
import { deleteCustomer, listCustomers } from './customers.api';
import type { Customer } from './customer.types';

export function CustomerListPage() {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const load = useCallback(async () => { setLoading(true); setError(null); try { setCustomers(await listCustomers(query)); } catch (cause) { setError(cause instanceof Error ? cause.message : '客户加载失败'); } finally { setLoading(false); } }, [query]);
  useEffect(() => { void load(); }, [load]);
  async function remove(customer: Customer) { try { await deleteCustomer(customer.id); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : '删除失败'); } }
  return <section className="feature-page"><div className="screen-head"><div><p className="eyebrow">客户资料</p><h1>客户管理</h1><p>支持已建档客户，也支持销售订单直接选择散客。</p></div><button className="btn-primary" type="button" onClick={() => { setEditing(null); setDrawerOpen(true); }}>新增客户</button></div><div className="toolbar"><input className="search-input" placeholder="搜索客户姓名或电话" aria-label="搜索客户" value={query} onChange={(event) => setQuery(event.target.value)} /><span className="status-pill">散客</span></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="table-panel"><table><thead><tr><th>客户</th><th>联系电话</th><th>地址</th><th>操作</th></tr></thead><tbody>{loading ? <tr><td colSpan={4}>加载中…</td></tr> : customers.length === 0 ? <tr><td colSpan={4}>暂无客户</td></tr> : customers.map((customer) => <tr key={customer.id}><td><strong>{customer.name}</strong><span className="table-sub">备注 · {customer.remark || '—'}</span></td><td>{customer.phone || '—'}</td><td>{customer.address || '—'}</td><td><button className="text-button" type="button" onClick={() => { setEditing(customer); setDrawerOpen(true); }}>编辑</button><button className="text-button" type="button" onClick={() => void remove(customer)}>删除</button></td></tr>)}</tbody></table></div><CustomerDrawer open={drawerOpen} customer={editing} onClose={() => setDrawerOpen(false)} onSaved={() => void load()} /></section>;
}
