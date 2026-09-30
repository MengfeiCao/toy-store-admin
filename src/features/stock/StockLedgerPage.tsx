import { useEffect, useState } from 'react';
import { listStockRecords } from './stock.api';
import type { StockRecord, StockRecordFilters } from './stock.types';

export function StockLedgerPage() {
  const [filters, setFilters] = useState<StockRecordFilters>({ source: 'all' });
  const [records, setRecords] = useState<StockRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setLoading(true); void listStockRecords(filters).then(setRecords).finally(() => setLoading(false)); }, [filters]);

  return <section className="feature-page"><div className="screen-head"><div><p className="eyebrow">库存管理</p><h1>库存流水</h1><p>入库为正数，销售出库为负数；每条记录关联来源单号。</p></div></div><div className="toolbar"><select className="filter-select" aria-label="流水来源" value={filters.source ?? 'all'} onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value as StockRecordFilters['source'] }))}><option value="all">全部来源</option><option value="stock_in">采购入库</option><option value="sales">销售出库</option></select><input className="filter-select" type="date" aria-label="流水日期" value={filters.date ?? ''} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))} /></div><div className="table-panel"><table><thead><tr><th>玩具</th><th>SKU</th><th>变动类型</th><th>变动数量</th><th>关联单号</th><th>操作时间</th></tr></thead><tbody>{loading ? <tr><td colSpan={6}>加载中…</td></tr> : records.length === 0 ? <tr><td colSpan={6}>暂无库存流水</td></tr> : records.map((record) => <tr key={record.id}><td>{record.productName}</td><td>{record.sku}</td><td>{record.source === 'stock_in' ? '采购入库' : '销售出库'}</td><td className={record.quantityDelta > 0 ? 'positive-number' : 'negative-number'}>{record.quantityDelta > 0 ? '+' : ''}{record.quantityDelta}</td><td>{record.sourceOrderNo}</td><td>{record.createdAt}</td></tr>)}</tbody></table></div></section>;
}
