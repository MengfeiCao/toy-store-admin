import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Input, InputNumber, Select, Space, Table } from 'antd';
import { useNavigate } from 'react-router-dom';
import { toAppError } from '../../lib/app-error';
import { listProducts } from '../products/products.api';
import type { ProductListItem } from '../products/product.types';
import { listSuppliers } from '../suppliers/suppliers.api';
import type { SupplierListItem } from '../suppliers/supplier.types';
import { confirmPurchaseOrder, getPurchaseOrder, savePurchaseOrderDraft } from './purchases.api';

type EditableItem = { productId: string; quantity: number; unitCost: number };
type PurchaseForm = { supplierId: string; remark?: string; items: EditableItem[] };

export function PurchaseOrderEditPage({ orderId }: { orderId?: string }) {
  const navigate = useNavigate();
  const [form] = Form.useForm<PurchaseForm>();
  const items = Form.useWatch('items', form) ?? [];
  const [activeOrderId, setActiveOrderId] = useState(orderId);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierListItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActiveOrderId(orderId);
    void Promise.all([
      listProducts({ status: 'active' }),
      listSuppliers({ status: 'active' }),
      orderId ? getPurchaseOrder(orderId) : Promise.resolve(null),
    ]).then(([productRows, supplierRows, detail]) => {
      setProducts(productRows);
      setSuppliers(supplierRows);
      form.setFieldsValue(detail ? {
        supplierId: detail.supplierId,
        remark: detail.remark ?? '',
        items: detail.items.map((item) => ({ productId: item.productId, quantity: item.quantity, unitCost: item.unitCost })),
      } : { supplierId: supplierRows[0]?.id ?? '', remark: '', items: [] });
    }).catch((cause) => setError(toAppError(cause).message));
  }, [form, orderId]);

  const total = useMemo(() => items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitCost || 0), 0), [items]);

  async function save(confirm: boolean) {
    setError(null);
    try {
      const values = await form.validateFields();
      if (!values.items?.length) { setError('请至少添加一个商品'); return; }
      setSaving(true);
      const id = await savePurchaseOrderDraft({ id: activeOrderId, supplierId: values.supplierId, remark: values.remark, items: values.items });
      setActiveOrderId(id);
      if (confirm) {
        await confirmPurchaseOrder(id);
        navigate(`/purchases/${id}/detail`, { replace: true });
      } else {
        navigate(`/purchases/${id}`, { replace: true });
      }
    } catch (cause) {
      setError(toAppError(cause).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="feature-page">
      <div className="screen-head"><div><p className="eyebrow">采购管理</p><h1>{orderId ? '编辑采购单' : '新建采购单'}</h1><p>采购价格在此单独维护，不改变商品资料中的权限边界。</p></div></div>
      <Form form={form} layout="vertical">
        <Form.Item label="供应商" name="supplierId" rules={[{ required: true, message: '请选择供应商' }]}><Select aria-label="选择供应商" options={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))} /></Form.Item>
        <Form.Item label="备注" name="remark"><Input.TextArea rows={2} /></Form.Item>
        <Form.List name="items">
          {(fields, { add, remove }) => {
            const nextProduct = products.find((product) => !items.some((item) => item.productId === product.id));
            return (
              <>
                <Button disabled={!nextProduct} style={{ marginBottom: 16 }} onClick={() => {
                  if (!nextProduct) return;
                  add({ productId: nextProduct.id, quantity: 1, unitCost: nextProduct.costPrice });
                }}>添加商品</Button>
                <Table rowKey="key" pagination={false} dataSource={fields} locale={{ emptyText: '请添加商品' }} columns={[
                  { title: '商品', render: (_, field) => <Form.Item name={[field.name, 'productId']} rules={[{ required: true, message: '请选择商品' }]} noStyle><Select virtual={false} aria-label={`采购商品-${field.name + 1}`} onChange={(productId) => {
                    const product = products.find((row) => row.id === productId);
                    form.setFieldValue(['items', field.name, 'unitCost'], product?.costPrice ?? 0);
                  }} options={products.map((product) => ({
                    value: product.id,
                    label: `${product.name} · ${product.sku}`,
                    disabled: items.some((item, index) => index !== field.name && item.productId === product.id),
                  }))} /></Form.Item> },
                  { title: '采购数量', render: (_, field) => { const item = items[field.name]; const product = products.find((row) => row.id === item?.productId); return <Form.Item name={[field.name, 'quantity']} rules={[{ required: true }]} noStyle><InputNumber aria-label={`采购数量-${product?.name ?? ''}`} min={1} precision={0} /></Form.Item>; } },
                  { title: '采购单价', render: (_, field) => { const item = items[field.name]; const product = products.find((row) => row.id === item?.productId); return <Form.Item name={[field.name, 'unitCost']} rules={[{ required: true }]} noStyle><InputNumber aria-label={`采购单价-${product?.name ?? ''}`} min={0} precision={2} /></Form.Item>; } },
                  { title: '小计', render: (_, field) => { const item = items[field.name]; return `¥${(Number(item?.quantity || 0) * Number(item?.unitCost || 0)).toFixed(2)}`; } },
                  { title: '操作', render: (_, field) => { const item = items[field.name]; const product = products.find((row) => row.id === item?.productId); return <Button type="link" aria-label={`移除${product?.name ?? '商品'}`} onClick={() => remove(field.name)}>移除</Button>; } },
                ]} />
              </>
            );
          }}
        </Form.List>
        <div className="stock-summary">合计 ¥{total.toFixed(2)}</div>
        {error && <Alert type="error" message={error} role="alert" showIcon />}
        <Space style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <Button disabled={saving} onClick={() => void save(false)}>保存草稿</Button>
          <Button type="primary" loading={saving} disabled={saving} onClick={() => void save(true)}>确认采购单</Button>
        </Space>
      </Form>
    </section>
  );
}
