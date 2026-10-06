import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Image, Input, Select, Space, Table, Tag, type TableColumnsType } from 'antd';
import { useAuth } from '../../auth/AuthProvider';
import { getProductImageUrl, listProducts, setProductStatus } from './products.api';
import type { ProductFilters, ProductListItem, ProductStatus } from './product.types';
import { ProductFormDrawer } from './ProductFormDrawer';

function money(value: number) { return `¥${value.toFixed(2)}`; }

type StockStatus = 'low' | 'normal' | 'unset';

function getStockStatus(product: ProductListItem): StockStatus {
  if (product.lowStockThreshold === null || product.lowStockThreshold === undefined) return 'unset';
  return product.stockQty <= product.lowStockThreshold ? 'low' : 'normal';
}

function ProductThumbnail({ product }: { product: ProductListItem }) {
  const [failed, setFailed] = useState(false);

  if (!product.imagePath || failed) {
    return <span style={{ alignItems: 'center', background: '#f2f4f7', borderRadius: 8, color: '#98a2b3', display: 'inline-flex', flex: '0 0 48px', fontSize: 12, height: 48, justifyContent: 'center', width: 48 }}>无图</span>;
  }

  return <Image width={48} height={48} src={getProductImageUrl(product.imagePath)} alt={`${product.name}商品图片`} style={{ borderRadius: 8, objectFit: 'cover' }} onError={() => setFailed(true)} />;
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
    { title: '玩具', render: (_, product) => <div style={{ alignItems: 'center', display: 'flex', gap: 12 }}><ProductThumbnail product={product} /><div><strong>{product.name}</strong><span className="table-sub">SKU · {product.sku}</span></div></div> },
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
      onFilter: (value, product) => getStockStatus(product) === value,
      render: (_, product) => {
        const status = getStockStatus(product);
        if (status === 'low') return <Tag color="red">库存不足</Tag>;
        if (status === 'normal') return <Tag color="green">库存正常</Tag>;
        return <Tag>未设置预警</Tag>;
      },
    },
    { title: '商品状态', render: (_, product) => product.status === 'active' ? <Tag color="green">在售</Tag> : <Tag>停用</Tag> },
    { title: '操作', render: (_, product) => <Space size={0}><Button type="link" size="small" onClick={() => { setEditingProduct(product); setDrawerOpen(true); }}>编辑</Button>{role === 'owner' && <Button type="link" size="small" danger={product.status === 'active'} onClick={() => void toggleStatus(product)}>{product.status === 'active' ? '停用' : '启用'}</Button>}</Space> },
  ];

  return (
    <section className="feature-page">
      <div className="screen-head"><div><p className="eyebrow">商品资料</p><h1>玩具管理</h1><p>当前库存只由入库和出库事务维护，不能直接编辑。</p></div>{role === 'owner' && <Button type="primary" onClick={() => { setEditingProduct(null); setDrawerOpen(true); }}>新增玩具</Button>}</div>
      <Space className="toolbar product-toolbar" wrap>
        <Input.Search className="product-search" type="search" placeholder="搜索名称、货号或条码" aria-label="搜索玩具" value={filters.query ?? ''} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} />
        {role === 'owner' && <Select className="product-status-filter" aria-label="商品状态" value={filters.status ?? 'all'} onChange={(status) => setFilters((current) => ({ ...current, status: status as ProductStatus | 'all' }))} options={[{ value: 'all', label: '全部状态' }, { value: 'active', label: '在售' }, { value: 'inactive', label: '停用' }]} />}
      </Space>
      {error && <Alert className="page-alert" type="error" message={error} role="alert" showIcon />}
      <Table rowKey="id" loading={loading} dataSource={products} columns={columns} pagination={false} locale={{ emptyText: '暂无玩具' }} scroll={{ x: 1000 }} />
      <ProductFormDrawer open={drawerOpen} role={role} product={editingProduct} onClose={() => setDrawerOpen(false)} onSaved={() => void load()} />
    </section>
  );
}
