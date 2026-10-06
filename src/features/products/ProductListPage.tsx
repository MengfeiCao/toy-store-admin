import { useCallback, useEffect, useState } from 'react';
import { Table, Tag, type TableColumnsType } from 'antd';
import { useAuth } from '../../auth/AuthProvider';
import { listProducts, setProductStatus } from './products.api';
import type { ProductFilters, ProductListItem, ProductStatus } from './product.types';
import { ProductFormDrawer } from './ProductFormDrawer';

function money(value: number) { return `¥${value.toFixed(2)}`; }

type StockStatus = 'low' | 'normal' | 'unset';

function getStockStatus(product: ProductListItem): StockStatus {
  if (product.lowStockThreshold === null || product.lowStockThreshold === undefined) return 'unset';
  return product.stockQty <= product.lowStockThreshold ? 'low' : 'normal';
}

export function ProductListPage() {
  const { profile } = useAuth();
  const role = profile?.role ?? 'staff';
  const [filters, setFilters] = useState<ProductFilters>({ query: '', status: role === 'owner' ? 'all' : 'active' });
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

  const columns: TableColumnsType<ProductListItem> = [
    { title: '玩具', render: (_, product) => <><strong>{product.name}</strong><span className="table-sub">SKU · {product.sku}</span></> },
    { title: '分类', dataIndex: 'category' },
    { title: '售价', dataIndex: 'salePrice', render: (value: number) => money(value) },
    ...(role === 'owner' ? [{ title: '成本价', dataIndex: 'costPrice', render: (value: number | null) => value === null ? '—' : money(value) }] : []),
    { title: '当前库存', dataIndex: 'stockQty', render: (value: number) => `${value} 件` },
    { title: '预警阈值', dataIndex: 'lowStockThreshold', render: (value: number | null | undefined) => value === null || value === undefined ? '—' : `${value} 件` },
    {
      title: '库存状态',
      filters: [
        { text: '库存不足', value: 'low' },
        { text: '库存正常', value: 'normal' },
        { text: '未设置预警', value: 'unset' },
      ],
      filterMultiple: false,
      filterIcon: <span aria-label="筛选库存状态">筛选</span>,
      onFilter: (value, product) => getStockStatus(product) === value,
      render: (_, product) => {
        const status = getStockStatus(product);
        if (status === 'low') return <Tag color="red">库存不足</Tag>;
        if (status === 'normal') return <Tag color="green">库存正常</Tag>;
        return <Tag>未设置预警</Tag>;
      },
    },
    { title: '商品状态', render: (_, product) => <span className={product.status === 'active' ? 'status-pill' : 'status-pill muted'}>{product.status === 'active' ? '在售' : '停用'}</span> },
    { title: '操作', render: (_, product) => <><button className="text-button" type="button" onClick={() => { setEditingProduct(product); setDrawerOpen(true); }}>编辑</button>{role === 'owner' && <button className="text-button" type="button" onClick={() => void toggleStatus(product)}>{product.status === 'active' ? '停用' : '启用'}</button>}</> },
  ];

  return (
    <section className="feature-page">
      <div className="screen-head"><div><p className="eyebrow">商品资料</p><h1>玩具管理</h1><p>当前库存只由入库和出库事务维护，不能直接编辑。</p></div>{role === 'owner' && <button className="btn-primary" type="button" onClick={() => { setEditingProduct(null); setDrawerOpen(true); }}>新增玩具</button>}</div>
      <div className="toolbar"><input className="search-input" placeholder="搜索名称、货号或条码" aria-label="搜索玩具" value={filters.query ?? ''} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} />{role === 'owner' && <select className="filter-select" aria-label="商品状态" value={filters.status ?? 'all'} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as ProductStatus | 'all' }))}><option value="all">全部状态</option><option value="active">在售</option><option value="inactive">停用</option></select>}</div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <Table rowKey="id" loading={loading} dataSource={products} columns={columns} pagination={false} locale={{ emptyText: '暂无玩具' }} scroll={{ x: 1000 }} />
      <ProductFormDrawer open={drawerOpen} role={role} product={editingProduct} onClose={() => setDrawerOpen(false)} onSaved={() => void load()} />
    </section>
  );
}
