import { useEffect, useState } from 'react';
import { Alert, Button, Input, Select, Space, Table, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { cancelSalesOrder, listSalesOrders } from './sales.api';
import type { SalesOrderFilters, SalesOrderListItem } from './sales.types';

export function SalesOrderListPage() {
  const [filters, setFilters] = useState<SalesOrderFilters>({ status: 'all', paymentStatus: 'all' });
  const [orders, setOrders] = useState<SalesOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  async function load() { setLoading(true); setError(null); try { setOrders(await listSalesOrders(filters)); } catch (cause) { setError(cause instanceof Error ? cause.message : '订单加载失败'); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, [filters]);
  async function cancel(order: SalesOrderListItem) { try { await cancelSalesOrder(order.id); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : '取消失败'); } }
  return <section className="feature-page"><div className="screen-head"><div><p className="eyebrow">销售管理</p><h1>销售订单</h1><p>新建订单时可以选择客户或散客，确认后等待出库。</p></div><Link to="/sales/new"><Button type="primary">新建订单</Button></Link></div><Space className="toolbar" wrap><Input.Search placeholder="搜索订单号或客户" aria-label="搜索销售订单" value={filters.query ?? ''} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} /><Select virtual={false} aria-label="订单状态" value={filters.status ?? 'all'} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} options={[{ value: 'all', label: '全部状态' }, { value: 'draft', label: '草稿' }, { value: 'pending_shipment', label: '待出库' }, { value: 'completed', label: '已完成' }, { value: 'cancelled', label: '已取消' }]} /><Select virtual={false} aria-label="收款状态" value={filters.paymentStatus ?? 'all'} onChange={(value) => setFilters((current) => ({ ...current, paymentStatus: value }))} options={[{ value: 'all', label: '全部收款' }, { value: 'unpaid', label: '未收款' }, { value: 'paid', label: '已收款' }]} /><Input type="date" aria-label="订单日期" value={filters.date ?? ''} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value || undefined }))} /></Space>{error && <Alert type="error" showIcon message={error} />}<Table rowKey="id" loading={loading} dataSource={orders} pagination={false} locale={{ emptyText: '暂无销售订单' }} columns={[
    { title: '订单号', render: (_, order) => <Link to={order.status === 'draft' ? `/sales/${order.id}` : `/sales/${order.id}/detail`}>{order.orderNo}</Link> },
    { title: '客户', dataIndex: 'customerName' }, { title: '金额', dataIndex: 'totalAmount', render: (value: number) => `¥${value.toFixed(2)}` },
    { title: '状态', render: (_, order) => <Tag color={order.status === 'completed' ? 'green' : order.status === 'cancelled' ? 'default' : 'blue'}>{order.status === 'draft' ? '草稿' : order.status === 'pending_shipment' ? '待出库' : order.status === 'completed' ? '已完成' : '已取消'}</Tag> },
    { title: '收款', render: (_, order) => order.paymentStatus === 'paid' ? <Tag color="green">已收款</Tag> : <Tag>未收款</Tag> },
    { title: '操作', render: (_, order) => (order.status === 'draft' || order.status === 'pending_shipment') ? <Button type="link" danger onClick={() => void cancel(order)}>取消</Button> : null },
  ]} /></section>;
}
