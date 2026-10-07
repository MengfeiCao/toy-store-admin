import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Descriptions, Popconfirm, Table, Tag } from 'antd';
import { toAppError } from '../../lib/app-error';
import { cancelPurchaseOrder, getPurchaseOrder, markPurchaseOrderPaid } from './purchases.api';
import type { PurchaseOrderDetail, PurchaseOrderStatus } from './purchase.types';
import { PurchaseReceiptDrawer } from './PurchaseReceiptDrawer';

const statusLabels: Record<PurchaseOrderStatus, string> = { draft: '草稿', confirmed: '已确认', partially_received: '部分到货', completed: '已完成', cancelled: '已取消' };

export function PurchaseOrderDetailPage({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<PurchaseOrderDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [paymentRequestId, setPaymentRequestId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setOrder(await getPurchaseOrder(orderId)); }
    catch (cause) { setError(toAppError(cause).message); }
  }, [orderId]);
  useEffect(() => { void load(); }, [load]);

  async function cancel() {
    setBusy(true);
    setError(null);
    try { await cancelPurchaseOrder(orderId); await load(); }
    catch (cause) { setError(toAppError(cause).message); }
    finally { setBusy(false); }
  }

  async function pay() {
    const requestId = paymentRequestId ?? crypto.randomUUID();
    setPaymentRequestId(requestId);
    setBusy(true);
    setError(null);
    try { await markPurchaseOrderPaid(orderId, requestId); setPaymentRequestId(null); await load(); }
    catch (cause) { setError(toAppError(cause).message); }
    finally { setBusy(false); }
  }

  if (!order) return <section className="feature-page"><p>加载中…</p>{error && <Alert type="error" message={error} />}</section>;
  return (
    <section className="feature-page">
      <div className="screen-head"><div><p className="eyebrow">采购订单</p><h1>{order.orderNo}</h1><p>{order.supplierName}</p></div><Tag>{statusLabels[order.status]}</Tag></div>
      <Descriptions bordered column={3} items={[{ key: 'supplier', label: '供应商', children: order.supplierName }, { key: 'amount', label: '采购金额', children: `¥${order.totalAmount.toFixed(2)}` }, { key: 'payment', label: '付款状态', children: order.paymentStatus === 'paid' ? '已付款' : '未付款' }]} />
      <Table rowKey="id" pagination={false} dataSource={order.items} style={{ marginTop: 20 }} columns={[{ title: '商品', dataIndex: 'productName' }, { title: 'SKU', dataIndex: 'sku' }, { title: '采购单价', dataIndex: 'unitCost', render: (value: number) => `¥${value.toFixed(2)}` }, { title: '采购数量', dataIndex: 'quantity' }, { title: '已到货', dataIndex: 'receivedQuantity' }, { title: '小计', dataIndex: 'amount', render: (value: number) => `¥${value.toFixed(2)}` }]} />
      {error && <Alert type="error" message={error} role="alert" showIcon style={{ marginTop: 16 }} />}
      <div className="drawer-actions">
        {(order.status === 'confirmed' || order.status === 'partially_received') && order.items.some((item) => item.receivedQuantity < item.quantity) && <Button type="primary" disabled={busy} onClick={() => setReceiptOpen(true)}>登记到货</Button>}
        {order.paymentStatus === 'unpaid' && order.status !== 'draft' && order.status !== 'cancelled' && <Popconfirm title="确认将这张采购单标记为已付款？" okText="确认" cancelText="返回" onConfirm={() => void pay()}><Button disabled={busy}>标记已付款</Button></Popconfirm>}
        {(order.status === 'draft' || order.status === 'confirmed') && <Popconfirm title="确认取消这张采购单？" okText="确认" cancelText="返回" onConfirm={() => void cancel()}><Button danger disabled={busy}>取消采购单</Button></Popconfirm>}
      </div>
      <PurchaseReceiptDrawer open={receiptOpen} order={order} onClose={() => setReceiptOpen(false)} onSaved={() => void load()} />
    </section>
  );
}
