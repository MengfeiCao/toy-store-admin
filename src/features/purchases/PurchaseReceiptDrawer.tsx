import { useEffect, useState } from 'react';
import { Alert, Button, Drawer, Form, Input, InputNumber, Space, Table } from 'antd';
import { toAppError } from '../../lib/app-error';
import { postPurchaseReceipt } from './purchases.api';
import type { PurchaseOrderDetail } from './purchase.types';

interface PurchaseReceiptDrawerProps {
  open: boolean;
  order: PurchaseOrderDetail;
  onClose: () => void;
  onSaved: () => void;
}

export function PurchaseReceiptDrawer({ open, order, onClose, onSaved }: PurchaseReceiptDrawerProps) {
  const [quantities, setQuantities] = useState<Record<string, number | null>>({});
  const [remark, setRemark] = useState('');
  const [requestId, setRequestId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remainingItems = order.items.filter((item) => item.receivedQuantity < item.quantity);

  useEffect(() => {
    if (!open) return;
    setQuantities(Object.fromEntries(remainingItems.map((item) => [item.id, null])));
    setRemark('');
    setRequestId(crypto.randomUUID());
    setError(null);
  }, [open, order.id]);

  async function submit() {
    const items = remainingItems.flatMap((item) => {
      const quantity = quantities[item.id];
      return quantity && quantity > 0 ? [{ purchaseOrderItemId: item.id, quantity }] : [];
    });
    if (!items.length) { setError('请填写至少一项本次到货数量'); return; }
    setSaving(true);
    setError(null);
    try {
      await postPurchaseReceipt({ requestId, purchaseOrderId: order.id, remark, items });
      onSaved();
      onClose();
    } catch (cause) {
      setError(toAppError(cause).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer title={`登记到货 · ${order.orderNo}`} open={open} onClose={onClose} width={620} destroyOnHidden getContainer={false}>
      <Table rowKey="id" pagination={false} dataSource={remainingItems} columns={[
        { title: '商品', render: (_, item) => <>{item.productName}<span className="table-sub">剩余 {item.quantity - item.receivedQuantity} 件</span></> },
        { title: '本次到货', render: (_, item) => <InputNumber aria-label={`本次到货-${item.productName}`} aria-valuemax={item.quantity - item.receivedQuantity} min={1} max={item.quantity - item.receivedQuantity} precision={0} value={quantities[item.id]} onChange={(value) => setQuantities((current) => ({ ...current, [item.id]: value }))} /> },
      ]} />
      <Form layout="vertical" style={{ marginTop: 16 }}><Form.Item label="到货备注"><Input.TextArea value={remark} onChange={(event) => setRemark(event.target.value)} rows={2} /></Form.Item></Form>
      {error && <Alert type="error" message={error} role="alert" showIcon />}
      <Space style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}><Button onClick={onClose}>取消</Button><Button type="primary" loading={saving} disabled={saving} onClick={() => void submit()}>{saving ? '提交中…' : '确认到货'}</Button></Space>
    </Drawer>
  );
}
