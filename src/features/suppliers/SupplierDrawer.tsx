import { useEffect, useState } from 'react';
import { Alert, Button, Drawer, Form, Input, Space } from 'antd';
import { toAppError } from '../../lib/app-error';
import { createSupplier, updateSupplier } from './suppliers.api';
import type { SupplierInput, SupplierListItem } from './supplier.types';

interface SupplierDrawerProps {
  open: boolean;
  supplier?: SupplierListItem | null;
  onClose: () => void;
  onSaved: () => void;
}

const emptyValues: SupplierInput = { name: '', contactName: '', phone: '', address: '', remark: '' };

export function SupplierDrawer({ open, supplier, onClose, onSaved }: SupplierDrawerProps) {
  const [form] = Form.useForm<SupplierInput>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue(supplier ? {
      name: supplier.name,
      contactName: supplier.contactName ?? '',
      phone: supplier.phone ?? '',
      address: supplier.address ?? '',
      remark: supplier.remark ?? '',
    } : emptyValues);
    setError(null);
  }, [form, open, supplier]);

  async function save(values: SupplierInput) {
    setSaving(true);
    setError(null);
    try {
      if (supplier) await updateSupplier(supplier.id, values);
      else await createSupplier(values);
      onSaved();
      onClose();
    } catch (cause) {
      setError(toAppError(cause).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer title={supplier ? '编辑供应商' : '新增供应商'} open={open} onClose={onClose} width={480} destroyOnHidden getContainer={false}>
      <Form form={form} layout="vertical" onFinish={(values) => void save(values)}>
        <Form.Item label="供应商名称" name="name" rules={[{ required: true, whitespace: true, message: '请输入供应商名称' }]}><Input /></Form.Item>
        <Form.Item label="联系人" name="contactName"><Input /></Form.Item>
        <Form.Item label="联系电话" name="phone"><Input /></Form.Item>
        <Form.Item label="地址" name="address"><Input.TextArea rows={2} /></Form.Item>
        <Form.Item label="备注" name="remark"><Input.TextArea rows={3} /></Form.Item>
        {error && <Alert type="error" message={error} role="alert" showIcon />}
        <Space style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <Button onClick={onClose}>取消</Button>
          <Button htmlType="submit" type="primary" loading={saving} disabled={saving}>{saving ? '保存中…' : '保存'}</Button>
        </Space>
      </Form>
    </Drawer>
  );
}
