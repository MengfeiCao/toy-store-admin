import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Input, InputNumber, Select, Table } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getSalesOrder } from '../sales/sales.api';
import type { SalesOrderDetail } from '../sales/sales.types';
import { postAfterSales } from './after-sales.api';
import type { AfterSalesCondition, AfterSalesType } from './after-sales.types';

export function AfterSalesCreatePage({ orderId }: { orderId: string }) {
  const navigate = useNavigate();
  const [order, setOrder] = useState<SalesOrderDetail | null>(null);
  const [type, setType] = useState<AfterSalesType>('return');
  const [remark, setRemark] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [conditions, setConditions] = useState<Record<string, AfterSalesCondition>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const requestId = useRef<string | null>(null);

  useEffect(() => { void getSalesOrder(orderId).then(setOrder).catch((reason) => setError(String(reason.message ?? reason))); }, [orderId]);
  const items = order?.items.filter((item) => item.quantity > (item.handledQuantity ?? 0)) ?? [];
  const refund = useMemo(() => items.reduce((sum, item) => sum + (quantities[item.id] ?? 0) * item.unitPrice, 0), [items, quantities]);

  const submit = async () => {
    if (!order || order.status !== 'completed') { setError('只有已出库订单可以办理售后'); return; }
    const selected = items.flatMap((item) => quantities[item.id] > 0 ? [{ salesOrderItemId: item.id, quantity: quantities[item.id], condition: conditions[item.id] ?? 'good' as const }] : []);
    if (!selected.length) { setError('请填写至少一项售后数量'); return; }
    requestId.current ??= crypto.randomUUID();
    setSaving(true);
    setError('');
    try {
      const id = await postAfterSales({ requestId: requestId.current, salesOrderId: order.id, type, remark, items: selected });
      requestId.current = null;
      navigate(`/after-sales/${id}`, { replace: true });
    } catch (reason) {
      setError(String(reason instanceof Error ? reason.message : reason));
    } finally {
      setSaving(false);
    }
  };

  if (!order) return <section className="feature-page">{error ? <Alert type="error" message={error} /> : <p>加载中…</p>}</section>;
  return <section className="feature-page">
    <div className="screen-head"><div><p className="eyebrow">销售售后</p><h1>办理售后 · {order.orderNo}</h1><p>累计退换数量不能超过原出库数量。</p></div></div>
    <Select aria-label="售后类型" value={type} onChange={setType} options={[{ value: 'return', label: '退货退款' }, { value: 'exchange', label: '同款换货' }]} />
    <Table rowKey="id" dataSource={items} pagination={false} columns={[
      { title: '商品', render: (_, item) => <>{item.productName}<span className="table-sub">可售后 {item.quantity - (item.handledQuantity ?? 0)} 件</span></> },
      { title: '原售价', dataIndex: 'unitPrice', render: (value: number) => `¥${value.toFixed(2)}` },
      { title: '数量', render: (_, item) => <InputNumber aria-label={`售后数量-${item.productName}`} min={0} max={item.quantity - (item.handledQuantity ?? 0)} precision={0} value={quantities[item.id]} onChange={(value) => setQuantities({ ...quantities, [item.id]: value ?? 0 })} /> },
      { title: '退回状况', render: (_, item) => <Select aria-label={`商品状况-${item.productName}`} value={conditions[item.id] ?? 'good'} onChange={(value) => setConditions({ ...conditions, [item.id]: value })} options={[{ value: 'good', label: '完好入库' }, { value: 'damaged', label: '损坏报损' }]} /> },
    ]} />
    <Input.TextArea aria-label="售后备注" value={remark} onChange={(event) => setRemark(event.target.value)} rows={2} />
    <p className="stock-summary">{type === 'return' ? order.paymentStatus === 'paid' ? `预计退款 ¥${refund.toFixed(2)}` : `待收净额将减少 ¥${refund.toFixed(2)}` : '同款同数量换货，不产生退款或差价'}</p>
    {error && <Alert type="error" message={error} />}
    <Button type="primary" loading={saving} disabled={saving} onClick={() => void submit()}>确认售后</Button>
  </section>;
}
