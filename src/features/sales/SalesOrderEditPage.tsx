import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, InputNumber, Select, Space, Table } from 'antd';
import { useNavigate } from 'react-router-dom';
import { listCustomers } from '../customers/customers.api';
import type { Customer } from '../customers/customer.types';
import { listProducts } from '../products/products.api';
import type { ProductListItem } from '../products/product.types';
import { getSalesOrder, saveSalesOrder } from './sales.api';
import type { SalesOrderItemDraft } from './sales.types';

type EditableItem = SalesOrderItemDraft & { unitPrice?: number; productName?: string; sku?: string };

export function SalesOrderEditPage({ orderId }: { orderId?: string }) {
  const navigate = useNavigate();
  const [activeOrderId, setActiveOrderId] = useState(orderId);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setActiveOrderId(orderId); void Promise.all([listProducts({ status: 'active' }), listCustomers(''), orderId ? getSalesOrder(orderId) : Promise.resolve(null)]).then(([productRows, customerRows, detail]) => { setProducts(productRows); setCustomers(customerRows); setSelectedProduct(productRows[0]?.id ?? ''); if (detail) { setCustomerId(detail.customerId); setItems(detail.items.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice, productName: item.productName, sku: item.sku }))); } }); }, [orderId]);
  const total = useMemo(() => items.reduce((sum, item) => sum + (item.unitPrice ?? products.find((product) => product.id === item.productId)?.salePrice ?? 0) * item.quantity, 0), [items, products]);
  function addProduct() { if (!selectedProduct) return; setItems((current) => current.some((item) => item.productId === selectedProduct) ? current.map((item) => item.productId === selectedProduct ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { productId: selectedProduct, quantity: 1 }]); }
  function updateQuantity(productId: string, quantity: number | null) { const value = Math.max(1, quantity ?? 1); setItems((current) => current.map((item) => item.productId === productId ? { ...item, quantity: value } : item)); }
  async function submit(confirm: boolean) { if (items.length === 0) { setMessageType('error'); setMessage('请至少添加一个玩具'); return; } setSaving(true); setMessage(null); try { const savedId = await saveSalesOrder({ id: activeOrderId, customerId, items: items.map(({ productId, quantity }) => ({ productId, quantity })), confirm }); setActiveOrderId(savedId); setMessageType('success'); setMessage(confirm ? '订单已确认' : '草稿已保存'); navigate(confirm ? `/sales/${savedId}/detail` : `/sales/${savedId}`, { replace: true }); } catch (cause) { setMessageType('error'); setMessage(cause instanceof Error ? cause.message : '保存失败'); } finally { setSaving(false); } }
  const rows = items.flatMap((item) => { const product = products.find((row) => row.id === item.productId); if (!product && item.unitPrice === undefined) return []; return [{ ...item, name: item.productName ?? product!.name, sku: item.sku ?? product!.sku, price: item.unitPrice ?? product!.salePrice }]; });
  return <section className="feature-page"><div className="screen-head"><div><p className="eyebrow">销售管理</p><h1>{orderId ? '编辑销售订单' : '新建销售订单'}</h1><p>售价由商品资料自动带出，订单可直接确认或先保存草稿。</p></div></div><div className="table-panel stock-form-panel"><div className="stock-form"><label>客户<Select virtual={false} aria-label="选择客户" value={customerId ?? ''} onChange={(value) => setCustomerId(value || null)} options={[{ value: '', label: '散客' }, ...customers.map((customer) => ({ value: customer.id, label: customer.name }))]} /></label><label>选择玩具<Select virtual={false} aria-label="选择玩具" value={selectedProduct} onChange={setSelectedProduct} options={products.map((product) => ({ value: product.id, label: `${product.name} · ${product.salePrice.toFixed(2)} 元` }))} /></label></div><div className="drawer-actions"><Button onClick={addProduct}>添加玩具</Button></div><Table rowKey="productId" dataSource={rows} pagination={false} locale={{ emptyText: '请添加玩具' }} columns={[
    { title: '玩具', render: (_, item) => <>{item.name}<span className="table-sub">SKU · {item.sku}</span></> },
    { title: '售价', render: (_, item) => <InputNumber aria-label="售价" value={item.price} precision={2} readOnly /> },
    { title: '数量', render: (_, item) => <InputNumber aria-label={`数量-${item.name}`} min={1} value={item.quantity} onChange={(value) => updateQuantity(item.productId, value)} /> },
    { title: '小计', render: (_, item) => `¥${(item.price * item.quantity).toFixed(2)}` },
  ]} /><div className="stock-summary">合计 ¥{total.toFixed(2)}</div>{message && <Alert type={messageType} showIcon message={message} />}<div className="drawer-actions"><Space><Button disabled={saving} onClick={() => void submit(false)}>保存草稿</Button><Button type="primary" loading={saving} onClick={() => void submit(true)}>确认订单</Button></Space></div></div></section>;
}
