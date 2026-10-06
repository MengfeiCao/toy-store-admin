import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Input, InputNumber, Select, Space, Table } from 'antd';
import type { InputRef } from 'antd';
import { useNavigate } from 'react-router-dom';
import { listCustomers } from '../customers/customers.api';
import type { Customer } from '../customers/customer.types';
import { getProductByBarcode } from '../products/products.api';
import type { BarcodeProduct } from '../products/product.types';
import { saveSalesOrder } from './sales.api';

type QuickSaleItem = BarcodeProduct & { quantity: number };

export function QuickSalePage() {
  const navigate = useNavigate();
  const scannerRef = useRef<InputRef>(null);
  const [barcode, setBarcode] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [items, setItems] = useState<QuickSaleItem[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string>();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { void listCustomers('').then(setCustomers).catch(() => setCustomers([])); scannerRef.current?.focus(); }, []);
  const total = useMemo(() => items.reduce((sum, item) => sum + item.salePrice * item.quantity, 0), [items]);

  async function scan() {
    const value = barcode.trim();
    if (!value) return;
    setBarcode(''); setError('');
    try {
      const product = await getProductByBarcode(value);
      if (!product) { setError('未找到该条码对应的启用商品'); return; }
      setItems((rows) => {
        const current = rows.find((item) => item.id === product.id);
        if ((current?.quantity ?? 0) >= product.stockQty) { setError(`库存不足，${product.name}当前仅有 ${product.stockQty} 件`); return rows; }
        return current ? rows.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...rows, { ...product, quantity: 1 }];
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '条码查询失败');
    } finally {
      scannerRef.current?.focus();
    }
  }

  function updateQuantity(productId: string, value: number | null) {
    setItems((rows) => rows.map((item) => {
      if (item.id !== productId) return item;
      const quantity = Math.max(1, Math.min(item.stockQty, Math.floor(value ?? 1)));
      if ((value ?? 1) > item.stockQty) setError(`库存不足，${item.name}当前仅有 ${item.stockQty} 件`);
      return { ...item, quantity };
    }));
  }

  async function submit(confirm: boolean) {
    if (items.length === 0) { setError('请先扫描商品'); return; }
    setSaving(true); setError('');
    try {
      const id = await saveSalesOrder({ ...(activeOrderId ? { id: activeOrderId } : {}), customerId, items: items.map((item) => ({ productId: item.id, quantity: item.quantity })), confirm });
      setActiveOrderId(id);
      navigate(confirm ? `/sales/${id}/detail` : `/quick-sale`, { replace: confirm });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '订单保存失败');
    } finally {
      setSaving(false); scannerRef.current?.focus();
    }
  }

  return <section className="feature-page">
    <div className="screen-head"><div><p className="eyebrow">销售管理</p><h1>扫码快速开单</h1><p>扫描枪回车即可添加，同一商品重复扫描自动累计数量。</p></div></div>
    <div className="quick-sale-toolbar">
      <Input ref={scannerRef} size="large" aria-label="扫描商品条码" placeholder="扫描或输入条码后回车" value={barcode} onChange={(event) => setBarcode(event.target.value)} onPressEnter={() => void scan()} />
      <Select aria-label="选择客户" value={customerId ?? ''} onChange={(value) => setCustomerId(value || null)} options={[{ value: '', label: '散客' }, ...customers.map((customer) => ({ value: customer.id, label: customer.name }))]} />
    </div>
    {error && <Alert type="error" showIcon message={error} />}
    <Table rowKey="id" dataSource={items} pagination={false} columns={[
      { title: '商品', dataIndex: 'name' }, { title: 'SKU', dataIndex: 'sku' },
      { title: '单价', dataIndex: 'salePrice', render: (value: number) => `¥${value.toFixed(2)}` },
      { title: '数量', render: (_, item: QuickSaleItem) => <InputNumber aria-label={`数量-${item.name}`} min={1} max={item.stockQty} precision={0} value={item.quantity} onChange={(value) => updateQuantity(item.id, value)} onBlur={(event) => {
        if (Number(event.target.value) > item.stockQty) setError(`库存不足，${item.name}当前仅有 ${item.stockQty} 件`);
      }} /> },
      { title: '小计', render: (_, item) => `¥${(item.salePrice * item.quantity).toFixed(2)}` },
      { title: '操作', render: (_, item) => <Button type="link" danger onClick={() => setItems((rows) => rows.filter((row) => row.id !== item.id))}>移除</Button> },
    ]} locale={{ emptyText: '等待扫描商品' }} />
    <div className="quick-sale-footer"><strong>合计 ¥{total.toFixed(2)}</strong><Space><Button disabled={saving} onClick={() => void submit(false)}>保存草稿</Button><Button type="primary" loading={saving} onClick={() => void submit(true)}>确认订单</Button></Space></div>
  </section>;
}
