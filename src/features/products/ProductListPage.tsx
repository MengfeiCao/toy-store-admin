import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { listProducts, setProductStatus } from './products.api';
import type { ProductFilters, ProductListItem, ProductStatus } from './product.types';
import { ProductFormDrawer } from './ProductFormDrawer';

function money(value: number) { return `¥${value.toFixed(2)}`; }

export function ProductListPage() {
  const { profile } = useAuth();
  const role = profile?.role ?? 'staff';
  const [filters, setFilters] = useState<ProductFilters>({ query: '', status: 'all' });
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductListItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setProducts(await listProducts(filters)); } catch (cause) { setError(cause instanceof Error ? cause.message : '商品加载失败'); } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { void load(); }, [load]);

  async function toggleStatus(product: ProductListItem) {
    await setProductStatus(product.id, product.status === 'active' ? 'inactive' : 'active');
    await load();
  }

  return (
    <section className="feature-page">
      <div className="screen-head"><div><p className="eyebrow">商品资料</p><h1>玩具管理</h1><p>当前库存只由入库和出库事务维护，不能直接编辑。</p></div>{role === 'owner' && <button className="btn-primary" type="button" onClick={() => { setEditingProduct(null); setDrawerOpen(true); }}>新增玩具</button>}</div>
      <div className="toolbar"><input className="search-input" placeholder="搜索名称、货号或条码" aria-label="搜索玩具" value={filters.query ?? ''} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} /><select className="filter-select" aria-label="商品状态" value={filters.status ?? 'all'} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as ProductStatus | 'all' }))}><option value="all">全部状态</option><option value="active">在售</option><option value="inactive">停用</option></select></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="table-panel"><table><thead><tr><th>玩具</th><th>分类</th><th>售价</th>{role === 'owner' && <th>成本价</th>}<th>当前库存</th><th>状态</th><th>操作</th></tr></thead><tbody>{loading ? <tr><td colSpan={role === 'owner' ? 7 : 6}>加载中…</td></tr> : products.length === 0 ? <tr><td colSpan={role === 'owner' ? 7 : 6}>暂无玩具</td></tr> : products.map((product) => <tr key={product.id}><td><strong>{product.name}</strong><span className="table-sub">SKU · {product.sku}</span></td><td>{product.category}</td><td>{money(product.salePrice)}</td>{role === 'owner' && <td>{product.costPrice === null ? '—' : money(product.costPrice)}</td>}<td>{product.stockQty} 件</td><td><span className={product.status === 'active' ? 'status-pill' : 'status-pill muted'}>{product.status === 'active' ? '在售' : '停用'}</span></td><td><button className="text-button" type="button" onClick={() => { setEditingProduct(product); setDrawerOpen(true); }}>编辑</button>{role === 'owner' && <button className="text-button" type="button" onClick={() => void toggleStatus(product)}>{product.status === 'active' ? '停用' : '启用'}</button>}</td></tr>)}</tbody></table></div>
      <ProductFormDrawer open={drawerOpen} role={role} product={editingProduct} onClose={() => setDrawerOpen(false)} onSaved={() => void load()} />
    </section>
  );
}
