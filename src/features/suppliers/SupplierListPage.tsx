import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Input, Popconfirm, Select, Space, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { toAppError } from '../../lib/app-error';
import { listSuppliers, setSupplierStatus } from './suppliers.api';
import type { SupplierFilters, SupplierListItem } from './supplier.types';
import { SupplierDrawer } from './SupplierDrawer';

export function SupplierListPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [filters, setFilters] = useState<SupplierFilters>({ query: '', status: 'all' });
  const [suppliers, setSuppliers] = useState<SupplierListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierListItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setSuppliers(await listSuppliers(filters)); }
    catch (cause) { setError(toAppError(cause).message); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { void load(); }, [load]);

  async function toggleStatus(supplier: SupplierListItem) {
    try {
      await setSupplierStatus(supplier.id, supplier.status === 'active' ? 'inactive' : 'active');
      messageApi.success(supplier.status === 'active' ? '供应商已停用' : '供应商已启用');
      await load();
    } catch (cause) {
      setError(toAppError(cause).message);
    }
  }

  const columns: ColumnsType<SupplierListItem> = [
    { title: '供应商', dataIndex: 'name', key: 'name', render: (name, row) => <><strong>{name}</strong><span className="table-sub">联系人 · {row.contactName || '—'}</span></> },
    { title: '联系电话', dataIndex: 'phone', key: 'phone', render: (value) => value || '—' },
    { title: '地址', dataIndex: 'address', key: 'address', render: (value) => value || '—' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (status) => <Tag color={status === 'active' ? 'green' : 'default'}>{status === 'active' ? '启用' : '停用'}</Tag> },
    { title: '操作', key: 'actions', render: (_, supplier) => <Space><Button type="link" onClick={() => { setEditing(supplier); setDrawerOpen(true); }}>编辑</Button><Popconfirm title={supplier.status === 'active' ? '确认停用这个供应商？' : '确认启用这个供应商？'} okText="确认" cancelText="取消" onConfirm={() => void toggleStatus(supplier)}><Button type="link">{supplier.status === 'active' ? '停用' : '启用'}</Button></Popconfirm></Space> },
  ];

  return (
    <section className="feature-page">
      {contextHolder}
      <div className="screen-head"><div><p className="eyebrow">采购资料</p><h1>供应商管理</h1><p>供应商不删除，停止合作后可停用，历史采购记录仍会保留。</p></div><Button type="primary" onClick={() => { setEditing(null); setDrawerOpen(true); }}>新增供应商</Button></div>
      <div className="toolbar">
        <Input.Search aria-label="搜索供应商" placeholder="搜索名称、联系人或电话" allowClear value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} style={{ maxWidth: 360 }} />
        <Select aria-label="供应商状态" value={filters.status} onChange={(status) => setFilters((current) => ({ ...current, status }))} options={[{ value: 'all', label: '全部状态' }, { value: 'active', label: '启用' }, { value: 'inactive', label: '停用' }]} style={{ width: 140 }} />
      </div>
      {error && <Alert type="error" message={error} role="alert" showIcon style={{ marginBottom: 16 }} />}
      <Table rowKey="id" columns={columns} dataSource={suppliers} loading={loading} pagination={false} locale={{ emptyText: '暂无供应商' }} />
      <SupplierDrawer open={drawerOpen} supplier={editing} onClose={() => setDrawerOpen(false)} onSaved={() => void load()} />
    </section>
  );
}
