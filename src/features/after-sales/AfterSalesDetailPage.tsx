import { useEffect, useState } from 'react';
import { Alert, Descriptions, Table, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { getAfterSales } from './after-sales.api';
import type { AfterSalesDetail } from './after-sales.types';

export function AfterSalesDetailPage({ id }: { id: string }) {
  const [detail, setDetail] = useState<AfterSalesDetail | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { void getAfterSales(id).then(setDetail).catch((reason) => setError(String(reason.message ?? reason))); }, [id]);
  if (!detail) return <section className="feature-page">{error ? <Alert type="error" message={error} /> : <p>加载中…</p>}</section>;
  return <section className="feature-page">
    <div className="screen-head"><div><p className="eyebrow">售后单</p><h1>{detail.afterSalesNo}</h1></div><Tag color="green">已完成</Tag></div>
    <Descriptions bordered items={[
      { key: 'order', label: '销售订单', children: <Link to={`/sales/${detail.salesOrderId}/detail`}>{detail.salesOrderNo}</Link> },
      { key: 'type', label: '类型', children: detail.type === 'return' ? '退货' : '换货' },
      { key: 'refund', label: '退款金额', children: `¥${detail.refundAmount.toFixed(2)}` },
      { key: 'remark', label: '备注', children: detail.remark || '—' },
    ]} />
    <Table rowKey="id" dataSource={detail.items} pagination={false} columns={[
      { title: '商品', dataIndex: 'productName' }, { title: 'SKU', dataIndex: 'sku' }, { title: '数量', dataIndex: 'quantity' },
      { title: '状况', dataIndex: 'condition', render: (value) => value === 'good' ? '完好入库' : '损坏报损' },
      { title: '原售价', dataIndex: 'unitPrice', render: (value: number) => `¥${value.toFixed(2)}` },
    ]} />
  </section>;
}
