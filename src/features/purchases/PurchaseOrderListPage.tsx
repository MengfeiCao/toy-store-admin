import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Input, Popconfirm, Select, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import { toAppError } from '../../lib/app-error';
import { listSuppliers } from '../suppliers/suppliers.api';
import type { SupplierListItem } from '../suppliers/supplier.types';
import { cancelPurchaseOrder, listPurchaseOrders } from './purchases.api';
import type { PurchaseOrderFilters, PurchaseOrderListItem, PurchaseOrderStatus } from './purchase.types';

const statusLabels: Record<PurchaseOrderStatus, string> = { draft: '草稿', confirmed: '已确认', partially_received: '部分到货', completed: '已完成', cancelled: '已取消' };

export function PurchaseOrderListPage() {
  const [filters, setFilters] = useState<PurchaseOrderFilters>({ status: 'all', paymentStatus: 'all' });
  const [orders, setOrders] = useState<PurchaseOrderListItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setOrders(await listPurchaseOrders(filters)); }
    catch (cause) { setError(toAppError(cause).message); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void listSuppliers({ status: 'all' }).then(setSuppliers).catch((cause) => setError(toAppError(cause).message)); }, []);

  async function cancel(id: string) {
    try { await cancelPurchaseOrder(id); await load(); }
    catch (cause) { setError(toAppError(cause).message); }
  }

  const columns: ColumnsType<PurchaseOrderListItem> = [
    { title: '采购单号', dataIndex: 'orderNo', render: (value, row) => <Link to={row.status === 'draft' ? `/purchases/${row.id}` : `/purchases/${row.id}/detail`}>{value}</Link> },
    { title: '供应商', dataIndex: 'supplierName' },
    { title: '金额', dataIndex: 'totalAmount', render: (value: number) => `¥${value.toFixed(2)}` },
    { title: '采购状态', dataIndex: 'status', render: (value: PurchaseOrderStatus) => <Tag>{statusLabels[value]}</Tag> },
    { title: '付款状态', dataIndex: 'paymentStatus', render: (value) => <Tag color={value === 'paid' ? 'green' : 'orange'}>{value === 'paid' ? '已付款' : '未付款'}</Tag> },
    { title: '操作', render: (_, row) => (row.status === 'draft' || row.status === 'confirmed') && <Popconfirm title="确认取消这张采购单？" okText="确认" cancelText="返回" onConfirm={() => void cancel(row.id)}><Button type="link">取消采购单</Button></Popconfirm> },
  ];

  return (
    <section className="feature-page">
      <div className="screen-head"><div><p className="eyebrow">采购管理</p><h1>采购订单</h1><p>采购草稿确认后冻结，可继续登记分批到货。</p></div><Link className="btn-primary" to="/purchases/new">新建采购单</Link></div>
      <div className="toolbar">
        <Input.Search aria-label="搜索采购单" placeholder="搜索单号或供应商" value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} style={{ maxWidth: 320 }} />
        <Select aria-label="供应商筛选" value={filters.supplierId ?? ''} onChange={(value) => setFilters((current) => ({ ...current, supplierId: value || undefined }))} options={[{ value: '', label: '全部供应商' }, ...suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))]} style={{ width: 180 }} />
        <Select aria-label="采购状态" value={filters.status} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} options={[{ value: 'all', label: '全部状态' }, ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))]} style={{ width: 150 }} />
        <Select aria-label="付款状态" value={filters.paymentStatus} onChange={(value) => setFilters((current) => ({ ...current, paymentStatus: value }))} options={[{ value: 'all', label: '全部付款' }, { value: 'unpaid', label: '未付款' }, { value: 'paid', label: '已付款' }]} style={{ width: 140 }} />
        <Input aria-label="采购日期" type="date" value={filters.date ?? ''} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value || undefined }))} style={{ width: 160 }} />
      </div>
      {error && <Alert type="error" message={error} role="alert" showIcon style={{ marginBottom: 16 }} />}
      <Table rowKey="id" columns={columns} dataSource={orders} loading={loading} pagination={false} locale={{ emptyText: '暂无采购单' }} />
    </section>
  );
}
