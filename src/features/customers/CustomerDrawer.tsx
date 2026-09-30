import { useEffect, useState, type FormEvent } from 'react';
import { toAppError } from '../../lib/app-error';
import { saveCustomer } from './customers.api';
import type { Customer, CustomerInput } from './customer.types';

interface CustomerDrawerProps { open: boolean; customer?: Customer | null; onClose: () => void; onSaved: () => void; }

export function CustomerDrawer({ open, customer, onClose, onSaved }: CustomerDrawerProps) {
  const [form, setForm] = useState<CustomerInput>({ name: '', phone: '', address: '', remark: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setForm(customer ? { id: customer.id, name: customer.name, phone: customer.phone ?? '', address: customer.address ?? '', remark: customer.remark ?? '' } : { name: '', phone: '', address: '', remark: '' }); setError(null); } }, [open, customer]);
  if (!open) return null;
  function update(field: keyof CustomerInput, value: string) { setForm((current) => ({ ...current, [field]: value })); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name?.trim()) { setError('客户姓名不能为空'); return; }
    setSaving(true); setError(null);
    try { await saveCustomer(form); onSaved(); onClose(); } catch (cause) { setError(toAppError(cause).message); } finally { setSaving(false); }
  }
  return <div className="drawer-backdrop" role="presentation"><section className="product-drawer" role="dialog" aria-modal="true" aria-labelledby="customer-drawer-title"><div className="drawer-header"><div><p className="eyebrow">客户资料</p><h2 id="customer-drawer-title">{customer ? '编辑客户' : '新增客户'}</h2></div><button type="button" className="drawer-close" onClick={onClose}>关闭</button></div><form className="product-form" onSubmit={submit}><label>客户姓名<input value={form.name ?? ''} onChange={(event) => update('name', event.target.value)} required /></label><label>联系电话<input type="text" inputMode="tel" value={form.phone ?? ''} onChange={(event) => update('phone', event.target.value)} /></label><label>地址<textarea value={form.address ?? ''} onChange={(event) => update('address', event.target.value)} /></label><label>备注<textarea value={form.remark ?? ''} onChange={(event) => update('remark', event.target.value)} /></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="drawer-actions"><button type="button" className="btn-secondary" onClick={onClose}>取消</button><button type="submit" className="btn-primary" disabled={saving}>{saving ? '保存中…' : '保存'}</button></div></form></section></div>;
}
