import { useEffect, useState } from 'react';
import { Alert, Table, Tag } from 'antd';
import { listStockInHistory } from './stock.api';
import type { StockInHistoryItem } from './stock.types';

export function StockInPage() {
  const [rows, setRows] = useState<StockInHistoryItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    void listStockInHistory().then(setRows).catch((reason) => setError(String(reason.message ?? reason)));
  }, []);

  return (
    <section className="feature-page">
      <div className="screen-head"><div><p className="eyebrow">库存管理</p><h1>历史手工入库</h1><p>手工入库已停用。新库存请从采购单到货入库，历史记录保留只读查询。</p></div></div>
      {error && <Alert message={error} />}
      <Table rowKey="id" dataSource={rows} pagination={false} columns={[
        { title: '入库单号', dataIndex: 'orderNo' },
        { title: '状态', dataIndex: 'status', render: (status) => <Tag color={status === 'posted' ? 'green' : 'default'}>{status === 'posted' ? '已入库' : '历史草稿'}</Tag> },
        { title: '总数量', dataIndex: 'totalQuantity' },
        { title: '创建时间', dataIndex: 'createdAt' },
      ]} />
    </section>
  );
}
