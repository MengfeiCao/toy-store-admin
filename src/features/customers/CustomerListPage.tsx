import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Input, Table, Tag } from 'antd';
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
  return <section className="feature-page"><div className="screen-head"><div><p className="eyebrow">客户资料</p><h1>客户管理</h1><p>支持已建档客户，也支持销售订单直接选择散客。</p></div><Button aria-label="新增客户" type="primary" onClick={() => { setEditing(null); setDrawerOpen(true); }}>新增客户</Button></div><div className="toolbar"><Input.Search placeholder="搜索客户姓名或电话" aria-label="搜索客户" value={query} onChange={(event) => setQuery(event.target.value)} /><Tag color="blue">散客</Tag></div>{error && <Alert type="error" showIcon message={error} />}<Table rowKey="id" loading={loading} dataSource={customers} pagination={false} locale={{ emptyText: '暂无客户' }} columns={[
    { title: '客户', render: (_, customer) => <><strong>{customer.name}</strong><span className="table-sub">备注 · {customer.remark || '—'}</span></> },
    { title: '联系电话', dataIndex: 'phone', render: (value: string | null) => value || '—' },
    { title: '地址', dataIndex: 'address', render: (value: string | null) => value || '—' },
    { title: '操作', render: (_, customer) => <><Button aria-label="编辑" type="link" onClick={() => { setEditing(customer); setDrawerOpen(true); }}>编辑</Button><Button aria-label="删除" type="link" danger onClick={() => void remove(customer)}>删除</Button></> },
  ]} /><CustomerDrawer open={drawerOpen} customer={editing} onClose={() => setDrawerOpen(false)} onSaved={() => void load()} /></section>;
}
