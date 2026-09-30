import { useEffect, useState } from 'react';
import { Alert, Button, Drawer, Form, Input, Space } from 'antd';
import { toAppError } from '../../lib/app-error';
import { saveCustomer } from './customers.api';
import type { Customer, CustomerInput } from './customer.types';

interface CustomerDrawerProps { open: boolean; customer?: Customer | null; onClose: () => void; onSaved: () => void; }

export function CustomerDrawer({ open, customer, onClose, onSaved }: CustomerDrawerProps) {
  const [form, setForm] = useState<CustomerInput>({ name: '', phone: '', address: '', remark: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setForm(customer ? { id: customer.id, name: customer.name, phone: customer.phone ?? '', address: customer.address ?? '', remark: customer.remark ?? '' } : { name: '', phone: '', address: '', remark: '' }); setError(null); } }, [open, customer]);
  function update(field: keyof CustomerInput, value: string) { setForm((current) => ({ ...current, [field]: value })); }
  async function submit() {
    if (!form.name?.trim()) { setError('客户姓名不能为空'); return; }
    setSaving(true); setError(null);
    try { await saveCustomer(form); onSaved(); onClose(); } catch (cause) { setError(toAppError(cause).message); } finally { setSaving(false); }
  }
  return <Drawer title={customer ? '编辑客户' : '新增客户'} open={open} onClose={onClose} destroyOnHidden extra={<Space><Button onClick={onClose}>取消</Button><Button type="primary" loading={saving} onClick={() => void submit()}>保存</Button></Space>}>
    <Form layout="vertical" onFinish={() => void submit()}>
      <Form.Item label="客户姓名" required><Input aria-label="客户姓名" value={form.name ?? ''} onChange={(event) => update('name', event.target.value)} /></Form.Item>
      <Form.Item label="联系电话"><Input aria-label="联系电话" inputMode="tel" value={form.phone ?? ''} onChange={(event) => update('phone', event.target.value)} /></Form.Item>
      <Form.Item label="地址"><Input.TextArea aria-label="地址" value={form.address ?? ''} onChange={(event) => update('address', event.target.value)} /></Form.Item>
      <Form.Item label="备注"><Input.TextArea aria-label="备注" value={form.remark ?? ''} onChange={(event) => update('remark', event.target.value)} /></Form.Item>
      {error && <Alert type="error" showIcon message={error} />}
    </Form>
  </Drawer>;
}
