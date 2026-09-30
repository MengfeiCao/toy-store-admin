import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { toAppError } from '../../lib/app-error';
import { createProduct, updateProductPricing, updateProductPublic, uploadProductImage } from './products.api';
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
  costPrice: string;
  salePrice: string;
  lowStockThreshold: string;
  imagePath: string;
};

const emptyForm: FormState = { sku: '', barcode: '', name: '', category: '', brand: '', ageRange: '', costPrice: '', salePrice: '', lowStockThreshold: '', imagePath: '' };

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
      costPrice: product.costPrice === null ? '' : String(product.costPrice),
      salePrice: String(product.salePrice),
      lowStockThreshold: product.lowStockThreshold == null ? '' : String(product.lowStockThreshold),
      imagePath: product.imagePath ?? '',
    } : emptyForm);
    setError(null);
    setImageError(null);
    setPendingFile(null);
  }, [open, product]);

  if (!open) return null;

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    await uploadImage(file);
  }

  async function uploadImage(file: File) {
    setUploading(true);
    setImageError(null);
    try {
      const imagePath = await uploadProductImage(file);
      updateField('imagePath', imagePath);
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
    const salePrice = Number(form.salePrice);
    const costPrice = Number(form.costPrice);
    if (role === 'owner' && (!Number.isFinite(salePrice) || salePrice < 0 || (!product && (!Number.isFinite(costPrice) || costPrice < 0)))) {
      setError('成本价和售价必须是大于等于 0 的数字');
      return;
    }
    setSaving(true);
    try {
      if (product) {
        const publicInput: PublicProductInput = { barcode: form.barcode, name: form.name, category: form.category, brand: form.brand, ageRange: form.ageRange, lowStockThreshold: form.lowStockThreshold ? Number(form.lowStockThreshold) : undefined, imagePath: form.imagePath || undefined };
        await updateProductPublic(product.id, publicInput);
        if (role === 'owner') await updateProductPricing(product.id, { costPrice, salePrice });
      } else {
        const input: CreateProductInput = { sku: form.sku, barcode: form.barcode, name: form.name, category: form.category, brand: form.brand, ageRange: form.ageRange, costPrice, salePrice, lowStockThreshold: form.lowStockThreshold ? Number(form.lowStockThreshold) : undefined, imagePath: form.imagePath || undefined };
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
    <div className="drawer-backdrop" role="presentation">
      <section className="product-drawer" role="dialog" aria-modal="true" aria-labelledby="product-drawer-title">
        <div className="drawer-header"><div><p className="eyebrow">玩具资料</p><h2 id="product-drawer-title">{product ? '编辑玩具' : '新增玩具'}</h2></div><button type="button" className="drawer-close" onClick={onClose}>关闭</button></div>
        <form className="product-form" onSubmit={handleSubmit}>
          <label>名称<input value={form.name} onChange={(event) => updateField('name', event.target.value)} required /></label>
          <label>货号<input value={form.sku} onChange={(event) => updateField('sku', event.target.value)} readOnly={Boolean(product) || role !== 'owner'} required /></label>
          <label>分类<input value={form.category} onChange={(event) => updateField('category', event.target.value)} required /></label>
          <label>条码<input value={form.barcode} onChange={(event) => updateField('barcode', event.target.value)} /></label>
          <label>品牌<input value={form.brand} onChange={(event) => updateField('brand', event.target.value)} /></label>
          <label>适合年龄<input value={form.ageRange} onChange={(event) => updateField('ageRange', event.target.value)} /></label>
          {role === 'owner' && <>
            <label>成本价<input type="number" min="0" step="0.01" value={form.costPrice} onChange={(event) => updateField('costPrice', event.target.value)} required /></label>
            <label>售价<input type="number" min="0" step="0.01" value={form.salePrice} onChange={(event) => updateField('salePrice', event.target.value)} required /></label>
          </>}
          <label>低库存提醒值<input type="number" min="0" step="1" value={form.lowStockThreshold} onChange={(event) => updateField('lowStockThreshold', event.target.value)} /></label>
          <label>商品图片<input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} />{uploading && <span className="form-hint">图片上传中…</span>}{imageError && <span className="form-error">{imageError}</span>}{imageError && pendingFile && <button type="button" className="text-button" onClick={() => void uploadImage(pendingFile)}>重试上传</button>}</label>
          {product && <p className="form-hint">当前库存 {product.stockQty} 件，只能通过入库和出库改变。</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="drawer-actions"><button type="button" className="btn-secondary" onClick={onClose}>取消</button><button type="submit" className="btn-primary" disabled={saving || uploading}>{saving ? '保存中…' : '保存'}</button></div>
        </form>
      </section>
    </div>
  );
}
