import { useEffect, useState } from 'react';
import { Alert, DatePicker, Input, Select, Table, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { listAfterSales } from './after-sales.api';
import type { AfterSalesListItem, AfterSalesType } from './after-sales.types';

export function AfterSalesListPage() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<AfterSalesType | 'all'>('all');
  const [date, setDate] = useState<string>();
  const [rows, setRows] = useState<AfterSalesListItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    void listAfterSales({ query, type, date }).then(setRows).catch((reason) => setError(String(reason.message ?? reason)));
  }, [date, query, type]);

  return <section className="feature-page">
    <div className="screen-head"><div><p className="eyebrow">销售管理</p><h1>售后管理</h1><p>查询已完成的退货、退款与同款换货。</p></div></div>
    <div className="toolbar">
      <Input.Search aria-label="搜索售后" value={query} onChange={(event) => setQuery(event.target.value)} />
      <Select aria-label="售后类型" value={type} onChange={setType} options={[{ value: 'all', label: '全部类型' }, { value: 'return', label: '退货' }, { value: 'exchange', label: '换货' }]} />
      <DatePicker aria-label="售后日期" onChange={(_, value) => setDate(typeof value === 'string' ? value : undefined)} />
    </div>
    {error && <Alert type="error" message={error} />}
    <Table rowKey="id" dataSource={rows} pagination={false} columns={[
      { title: '售后单号', dataIndex: 'afterSalesNo', render: (value, row) => <Link to={`/after-sales/${row.id}`}>{value}</Link> },
      { title: '销售订单', dataIndex: 'salesOrderNo' },
      { title: '客户', dataIndex: 'customerName' },
      { title: '类型', dataIndex: 'type', render: (value: AfterSalesType) => <Tag>{value === 'return' ? '退货' : '换货'}</Tag> },
      { title: '数量', dataIndex: 'totalQuantity' },
      { title: '退款', dataIndex: 'refundAmount', render: (value: number) => `¥${value.toFixed(2)}` },
      { title: '完成时间', dataIndex: 'completedAt' },
    ]} />
  </section>;
}
