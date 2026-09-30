import { useEffect, useState } from 'react';
import { listProducts } from '../products/products.api';
import type { ProductListItem } from '../products/product.types';
import { getStockIn, postStockIn, saveStockInDraft } from './stock.api';

export function StockInPage() {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [orderId, setOrderId] = useState<string>();
  const [status, setStatus] = useState<'draft' | 'posted'>('draft');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => { void listProducts({ status: 'active' }).then((items) => { setProducts(items); setProductId(items[0]?.id ?? ''); }); }, []);

  async function saveDraft() {
    const parsed = Number(quantity);
    if (!Number.isInteger(parsed) || parsed <= 0 || !productId) { setMessage('请输入大于 0 的整数数量'); return; }
    setSaving(true); setMessage(null);
    try { const id = await saveStockInDraft({ orderId, items: [{ productId, quantity: parsed }] }); setOrderId(id); setMessage('草稿已保存'); } catch (cause) { setMessage(cause instanceof Error ? cause.message : '保存失败'); } finally { setSaving(false); }
  }

  async function confirmStockIn() {
    const parsed = Number(quantity);
    if (!Number.isInteger(parsed) || parsed <= 0 || !productId) { setMessage('请输入大于 0 的整数数量'); return; }
    setPosting(true); setMessage(null);
    try {
      const id = orderId ?? await saveStockInDraft({ items: [{ productId, quantity: parsed }] });
      setOrderId(id);
      await postStockIn(id);
      setStatus('posted'); setMessage('入库已确认');
    } catch (cause) {
      if (orderId) {
        try { const detail = await getStockIn(orderId); setStatus(detail.status); if (detail.status === 'posted') { setMessage('入库已确认'); return; } } catch { /* 保留原始错误 */ }
      }
      setMessage(cause instanceof Error ? cause.message : '确认失败');
    } finally { setPosting(false); }
  }

  return <section className="feature-page"><div className="screen-head"><div><p className="eyebrow">库存管理</p><h1>入库单</h1><p>保存草稿后可继续编辑；确认入库会增加库存并生成正向流水。</p></div><span className="status-pill">{status === 'posted' ? '已入库' : '草稿'}</span></div><div className="table-panel stock-form-panel"><div className="stock-form"><label>玩具<select aria-label="入库玩具" value={productId} onChange={(event) => setProductId(event.target.value)}>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · 当前库存 {product.stockQty}</option>)}</select></label><label>入库数量<input aria-label="入库数量" type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} readOnly={status === 'posted'} /></label></div><div className="stock-summary">本次入库 {quantity || 0} 件，确认后库存会从数据库事务中增加。</div><div className="drawer-actions"><button className="btn-secondary" type="button" onClick={() => void saveDraft()} disabled={saving || posting || status === 'posted'}>{saving ? '保存中…' : '保存草稿'}</button><button className="btn-primary" type="button" onClick={() => void confirmStockIn()} disabled={saving || posting || status === 'posted'}>{posting ? '确认中…' : '确认入库'}</button></div>{message && <p className="form-hint" aria-live="polite">{message}</p>}</div></section>;
}
