import { useEffect, useState } from 'react';
import { Alert, Button } from 'antd';
import { getSalesOrder } from './sales.api';
import type { PaymentMethod, SalesOrderDetail } from './sales.types';

const paymentLabels: Record<PaymentMethod, string> = { wechat: '微信', alipay: '支付宝', cash: '现金', other: '其他' };

export function ReceiptPage({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<SalesOrderDetail | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { void getSalesOrder(orderId).then(setOrder).catch((reason) => setError(reason instanceof Error ? reason.message : '小票加载失败')); }, [orderId]);
  if (!order) return <section className="receipt-page">{error ? <Alert type="error" message={error} /> : '小票加载中…'}</section>;
  const time = order.shippedAt ?? order.createdAt;
  return <section className="receipt-screen">
    <div className="receipt-actions"><Button type="primary" onClick={() => window.print()}>打印小票</Button></div>
    <article className="receipt-page">
      <header><h1>乐奇玩具</h1><p>销售小票</p></header>
      <dl><div><dt>订单号</dt><dd>{order.orderNo}</dd></div><div><dt>时间</dt><dd>{time ? new Date(time).toLocaleString('zh-CN', { hour12: false }) : '—'}</dd></div><div><dt>客户</dt><dd>{order.customerName}</dd></div></dl>
      <table><thead><tr><th>商品</th><th>数量</th><th>单价</th><th>金额</th></tr></thead><tbody>{order.items.map((item) => <tr key={item.id ?? item.productId}><td>{item.productName}</td><td>{item.quantity}</td><td>¥{item.unitPrice.toFixed(2)}</td><td>¥{(item.unitPrice * item.quantity).toFixed(2)}</td></tr>)}</tbody></table>
      <div className="receipt-total"><span>合计</span><strong>¥{order.totalAmount.toFixed(2)}</strong></div>
      <p>付款方式：{order.paymentMethod ? paymentLabels[order.paymentMethod] : order.paymentStatus === 'paid' ? '已付款' : '未付款'}</p>
      <footer>感谢惠顾，欢迎再次光临</footer>
    </article>
  </section>;
}
