import { useEffect, useState, type FormEvent } from 'react';
import { Alert, Button, Drawer, Form, Image, Input, InputNumber, Space, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { toAppError } from '../../lib/app-error';
import { createProduct, getProductImageUrl, updateProductPricing, updateProductPublic, uploadProductImage } from './products.api';
import type { CreateProductInput, ProductListItem, PublicProductInput } from './product.types';

interface ProductFormDrawerProps {
  open: boolean;
  role: 'owner' | 'staff';
  product?: ProductListItem | null;
  onClose: () => void;
  onSaved: () => void;
}

type FormState = {
  sku: string;
  barcode: string;
  name: string;
  category: string;
  brand: string;
  ageRange: string;
  costPrice: number | null;
  salePrice: number | null;
  lowStockThreshold: number | null;
  imagePath: string;
};

const emptyForm: FormState = {
  sku: '', barcode: '', name: '', category: '', brand: '', ageRange: '',
  costPrice: null, salePrice: null, lowStockThreshold: null, imagePath: '',
};

export function ProductFormDrawer({ open, role, product, onClose, onSaved }: ProductFormDrawerProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(product ? {
      sku: product.sku,
      barcode: product.barcode ?? '',
      name: product.name,
      category: product.category,
      brand: product.brand ?? '',
      ageRange: product.ageRange ?? '',
      costPrice: product.costPrice,
      salePrice: product.salePrice,
      lowStockThreshold: product.lowStockThreshold ?? null,
      imagePath: product.imagePath ?? '',
    } : emptyForm);
    setError(null);
    setImageError(null);
    setPendingFile(null);
  }, [open, product]);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function uploadImage(file: File) {
    setPendingFile(file);
    setUploading(true);
    setImageError(null);
    try {
      updateField('imagePath', await uploadProductImage(file));
    } catch (cause) {
      setImageError(`${toAppError(cause).message}，可重试上传`);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.category.trim() || (!product && !form.sku.trim())) {
      setError('请填写名称、分类和货号');
      return;
    }
    if (role === 'owner' && (form.salePrice === null || form.salePrice < 0 || (!product && (form.costPrice === null || form.costPrice < 0)))) {
      setError('成本价和售价必须是大于等于 0 的数字');
      return;
    }
    if (form.lowStockThreshold !== null && (!Number.isInteger(form.lowStockThreshold) || form.lowStockThreshold < 0)) {
      setError('低库存提醒值必须是大于等于 0 的整数');
      return;
    }
    setSaving(true);
    try {
      if (product) {
        const publicInput: PublicProductInput = {
          barcode: form.barcode,
          name: form.name,
          category: form.category,
          brand: form.brand,
          ageRange: form.ageRange,
          lowStockThreshold: form.lowStockThreshold ?? undefined,
          imagePath: form.imagePath || undefined,
        };
        await updateProductPublic(product.id, publicInput);
        if (role === 'owner') await updateProductPricing(product.id, { costPrice: form.costPrice ?? 0, salePrice: form.salePrice ?? 0 });
      } else {
        const input: CreateProductInput = {
          sku: form.sku,
          barcode: form.barcode,
          name: form.name,
          category: form.category,
          brand: form.brand,
          ageRange: form.ageRange,
          costPrice: form.costPrice ?? 0,
          salePrice: form.salePrice ?? 0,
          lowStockThreshold: form.lowStockThreshold ?? undefined,
          imagePath: form.imagePath || undefined,
        };
        await createProduct(input);
      }
      onSaved();
      onClose();
    } catch (cause) {
      setError(toAppError(cause).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer title={product ? '编辑玩具' : '新增玩具'} open={open} onClose={onClose} width={480} destroyOnHidden getContainer={false}>
      <Form layout="vertical" component="form" onSubmitCapture={(event) => void handleSubmit(event)}>
        <Form.Item label="名称" required><Input aria-label="名称" value={form.name} onChange={(event) => updateField('name', event.target.value)} /></Form.Item>
        <Form.Item label="货号" required><Input aria-label="货号" value={form.sku} onChange={(event) => updateField('sku', event.target.value)} readOnly={Boolean(product) || role !== 'owner'} /></Form.Item>
        <Form.Item label="分类" required><Input aria-label="分类" value={form.category} onChange={(event) => updateField('category', event.target.value)} /></Form.Item>
        <Form.Item label="条码"><Input aria-label="条码" value={form.barcode} onChange={(event) => updateField('barcode', event.target.value)} /></Form.Item>
        <Form.Item label="品牌"><Input aria-label="品牌" value={form.brand} onChange={(event) => updateField('brand', event.target.value)} /></Form.Item>
        <Form.Item label="适合年龄"><Input aria-label="适合年龄" value={form.ageRange} onChange={(event) => updateField('ageRange', event.target.value)} /></Form.Item>
        {role === 'owner' && <>
          <Form.Item label="成本价" required><InputNumber aria-label="成本价" min={0} precision={2} value={form.costPrice} onChange={(value) => updateField('costPrice', value)} style={{ width: '100%' }} /></Form.Item>
          <Form.Item label="售价" required><InputNumber aria-label="售价" min={0} precision={2} value={form.salePrice} onChange={(value) => updateField('salePrice', value)} style={{ width: '100%' }} /></Form.Item>
        </>}
        <Form.Item label="低库存提醒值"><InputNumber aria-label="低库存提醒值" min={0} precision={0} value={form.lowStockThreshold} onChange={(value) => updateField('lowStockThreshold', value)} style={{ width: '100%' }} /></Form.Item>
        <Form.Item label="商品图片">
          <label>
            <span className="sr-only">商品图片</span>
            <Upload accept="image/*" maxCount={1} showUploadList={false} beforeUpload={(file) => { void uploadImage(file as File); return false; }}>
              <Button icon={<UploadOutlined />} loading={uploading}>选择图片</Button>
            </Upload>
          </label>
          {form.imagePath && <div style={{ marginTop: 12 }}><Image width={120} src={getProductImageUrl(form.imagePath)} alt="商品图片预览" /></div>}
          {imageError && <Space direction="vertical" style={{ marginTop: 8 }}><Alert type="error" message={imageError} />{pendingFile && <Button type="link" onClick={() => void uploadImage(pendingFile)}>重试上传</Button>}</Space>}
        </Form.Item>
        {product && <p className="form-hint">当前库存 {product.stockQty} 件，只能通过库存业务改变。</p>}
        {error && <Alert type="error" message={error} role="alert" />}
        <Space style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <Button onClick={onClose}>取消</Button>
          <Button htmlType="submit" type="primary" loading={saving} disabled={uploading}>保存</Button>
        </Space>
      </Form>
    </Drawer>
  );
}
