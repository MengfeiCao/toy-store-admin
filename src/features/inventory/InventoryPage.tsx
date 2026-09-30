import { useEffect, useState } from 'react';
import { Alert, Input, Table, Tag } from 'antd';
import { listInventory } from './inventory.api';
import type { InventoryItem } from './inventory.types';

export function InventoryPage({ alertOnly = false }: { alertOnly?: boolean }) {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<InventoryItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    void listInventory(query, alertOnly).then(setRows).catch((reason) => setError(String(reason.message ?? reason)));
  }, [alertOnly, query]);

  return (
    <section className="feature-page">
      <div className="screen-head"><div><p className="eyebrow">库存管理</p><h1>{alertOnly ? '库存预警' : '当前库存'}</h1></div></div>
      <Input.Search aria-label="搜索库存" value={query} onChange={(event) => setQuery(event.target.value)} />
      {error && <Alert message={error} />}
      <Table rowKey="id" dataSource={rows} pagination={false} columns={[
        { title: '商品', dataIndex: 'name' },
        { title: 'SKU', dataIndex: 'sku' },
        { title: '分类', dataIndex: 'category' },
        { title: '库存', dataIndex: 'stockQty', render: (value: number) => `${value} 件` },
        { title: '预警', render: (_, row) => row.lowStockThreshold !== null && row.stockQty <= row.lowStockThreshold ? <Tag color="red">库存不足</Tag> : '—' },
      ]} />
    </section>
  );
}
