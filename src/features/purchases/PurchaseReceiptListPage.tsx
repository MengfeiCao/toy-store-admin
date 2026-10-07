import { useCallback, useEffect, useState } from 'react';
import { Alert, Input, Select, Table } from 'antd';
import { toAppError } from '../../lib/app-error';
import { listSuppliers } from '../suppliers/suppliers.api';
import type { SupplierListItem } from '../suppliers/supplier.types';
import { listPurchaseReceipts } from './purchases.api';
import type { PurchaseReceiptFilters, PurchaseReceiptListItem } from './purchase.types';

export function PurchaseReceiptListPage() {
  const [filters, setFilters] = useState<PurchaseReceiptFilters>({});
  const [receipts, setReceipts] = useState<PurchaseReceiptListItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { setLoading(true); setError(null); try { setReceipts(await listPurchaseReceipts(filters)); } catch (cause) { setError(toAppError(cause).message); } finally { setLoading(false); } }, [filters]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void listSuppliers({ status: 'all' }).then(setSuppliers).catch((cause) => setError(toAppError(cause).message)); }, []);

  return <section className="feature-page"><div className="screen-head"><div><p className="eyebrow">采购管理</p><h1>到货历史</h1><p>查看每次分批到货的数量、采购单和供应商。</p></div></div><div className="toolbar"><Input.Search aria-label="搜索到货单" placeholder="搜索到货单、采购单或供应商" value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} style={{ maxWidth: 340 }} /><Select aria-label="到货供应商" value={filters.supplierId ?? ''} onChange={(value) => setFilters((current) => ({ ...current, supplierId: value || undefined }))} options={[{ value: '', label: '全部供应商' }, ...suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))]} style={{ width: 180 }} /><Input aria-label="到货日期" type="date" value={filters.date ?? ''} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value || undefined }))} style={{ width: 160 }} /></div>{error && <Alert type="error" message={error} role="alert" showIcon style={{ marginBottom: 16 }} />}<Table rowKey="id" dataSource={receipts} loading={loading} pagination={false} locale={{ emptyText: '暂无到货记录' }} columns={[{ title: '到货单号', dataIndex: 'receiptNo' }, { title: '采购单号', dataIndex: 'purchaseOrderNo' }, { title: '供应商', dataIndex: 'supplierName' }, { title: '到货数量', dataIndex: 'totalQuantity', render: (value: number) => `${value} 件` }, { title: '到货时间', dataIndex: 'receivedAt', render: (value: string) => new Date(value).toLocaleString('zh-CN') }]} /></section>;
}
