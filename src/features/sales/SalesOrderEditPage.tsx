import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listCustomers } from '../customers/customers.api';
import type { Customer } from '../customers/customer.types';
import { listProducts } from '../products/products.api';
import type { ProductListItem } from '../products/product.types';
import { getSalesOrder, saveSalesOrder } from './sales.api';
import type { SalesOrderItemDraft } from './sales.types';

export function SalesOrderEditPage({ orderId }: { orderId?: string }) {
  const navigate = useNavigate();
  const [activeOrderId, setActiveOrderId] = useState(orderId);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [items, setItems] = useState<SalesOrderItemDraft[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setActiveOrderId(orderId); void Promise.all([listProducts({ status: 'active' }), listCustomers(''), orderId ? getSalesOrder(orderId) : Promise.resolve(null)]).then(([productRows, customerRows, detail]) => { setProducts(productRows); setCustomers(customerRows); setSelectedProduct(productRows[0]?.id ?? ''); if (detail) { setCustomerId(detail.customerId); setItems(detail.items.map((item) => ({ productId: item.productId, quantity: item.quantity }))); } }); }, [orderId]);
  const total = useMemo(() => items.reduce((sum, item) => sum + (products.find((product) => product.id === item.productId)?.salePrice ?? 0) * item.quantity, 0), [items, products]);
  function addProduct() { if (!selectedProduct) return; setItems((current) => current.some((item) => item.productId === selectedProduct) ? current.map((item) => item.productId === selectedProduct ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { productId: selectedProduct, quantity: 1 }]); }
  function updateQuantity(productId: string, quantity: string) { const value = Math.max(1, Number(quantity) || 1); setItems((current) => current.map((item) => item.productId === productId ? { ...item, quantity: value } : item)); }
  async function submit(confirm: boolean) { if (items.length === 0) { setMessage('请至少添加一个玩具'); return; } setSaving(true); setMessage(null); try { const savedId = await saveSalesOrder({ id: activeOrderId, customerId, items, confirm }); setActiveOrderId(savedId); setMessage(confirm ? '订单已确认' : '草稿已保存'); navigate(confirm ? `/sales/${savedId}/detail` : `/sales/${savedId}`, { replace: true }); } catch (cause) { setMessage(cause instanceof Error ? cause.message : '保存失败'); } finally { setSaving(false); } }
  return <section className="feature-page"><div className="screen-head"><div><p className="eyebrow">销售管理</p><h1>{orderId ? '编辑销售订单' : '新建销售订单'}</h1><p>售价由商品资料自动带出，订单可直接确认或先保存草稿。</p></div></div><div className="table-panel stock-form-panel"><div className="stock-form"><label>客户<select aria-label="选择客户" value={customerId ?? ''} onChange={(event) => setCustomerId(event.target.value || null)}><option value="">散客</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label><label>选择玩具<select aria-label="选择玩具" value={selectedProduct} onChange={(event) => setSelectedProduct(event.target.value)}>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.salePrice.toFixed(2)} 元</option>)}</select></label></div><div className="drawer-actions"><button className="btn-secondary" type="button" onClick={addProduct}>添加玩具</button></div><div className="table-panel"><table><thead><tr><th>玩具</th><th>售价</th><th>数量</th><th>小计</th></tr></thead><tbody>{items.length === 0 ? <tr><td colSpan={4}>请添加玩具</td></tr> : items.map((item) => { const product = products.find((row) => row.id === item.productId); if (!product) return null; return <tr key={item.productId}><td>{product.name}<span className="table-sub">SKU · {product.sku}</span></td><td><input aria-label="售价" value={product.salePrice.toFixed(2)} readOnly /></td><td><input aria-label={`数量-${product.name}`} type="number" min="1" value={item.quantity} onChange={(event) => updateQuantity(item.productId, event.target.value)} /></td><td>¥{(product.salePrice * item.quantity).toFixed(2)}</td></tr>; })}</tbody></table></div><div className="stock-summary">合计 ¥{total.toFixed(2)}</div>{message && <p className="form-hint" aria-live="polite">{message}</p>}<div className="drawer-actions"><button className="btn-secondary" type="button" disabled={saving} onClick={() => void submit(false)}>保存草稿</button><button className="btn-primary" type="button" disabled={saving} onClick={() => void submit(true)}>{saving ? '确认中…' : '确认订单'}</button></div></div></section>;
}
