import { useEffect, useState } from 'react';
import { DatePicker, Select, Table } from 'antd';
import { listStockRecords } from './stock.api';
import type { StockRecord, StockRecordFilters, StockRecordSource } from './stock.types';

const sourceLabels: Record<StockRecordSource, string> = {
  stock_in: '历史手工入库',
  sales: '销售出库',
  purchase_receipt: '采购到货',
  stock_count: '盘点差异',
  surplus: '盘盈调整',
  shortage: '短缺调整',
  damage: '破损调整',
  manual: '手工调整',
};

export function StockLedgerPage() {
  const [filters, setFilters] = useState<StockRecordFilters>({ source: 'all' });
  const [records, setRecords] = useState<StockRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void listStockRecords(filters).then(setRecords).finally(() => setLoading(false));
  }, [filters]);

  return (
    <section className="feature-page">
      <div className="screen-head"><div><p className="eyebrow">库存管理</p><h1>库存流水</h1><p>集中查看采购、销售、盘点和调整产生的库存变化。</p></div></div>
      <div className="toolbar">
        <Select aria-label="流水来源" value={filters.source} onChange={(source) => setFilters((current) => ({ ...current, source }))} options={[
          { value: 'all', label: '全部来源' },
          ...Object.entries(sourceLabels).map(([value, label]) => ({ value, label })),
        ]} />
        <DatePicker aria-label="流水日期" onChange={(_, date) => setFilters((current) => ({ ...current, date: typeof date === 'string' ? date : undefined }))} />
      </div>
      <Table rowKey="id" dataSource={records} loading={loading} pagination={false} columns={[
        { title: '玩具', dataIndex: 'productName' },
        { title: 'SKU', dataIndex: 'sku' },
        { title: '变动类型', dataIndex: 'source', render: (source: StockRecordSource) => sourceLabels[source] },
        { title: '变动数量', dataIndex: 'quantityDelta', render: (value: number) => `${value > 0 ? '+' : ''}${value}` },
        { title: '关联单号', dataIndex: 'sourceOrderNo' },
        { title: '操作时间', dataIndex: 'createdAt' },
      ]} />
    </section>
  );
}
