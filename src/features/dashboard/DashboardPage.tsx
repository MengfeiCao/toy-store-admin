import { useAuth } from '../../auth/AuthProvider';
import { useEffect, useState } from 'react';
import { getDashboard, listLowStockProducts } from './dashboard.api';
import type { Dashboard, DateRange, LowStockProduct } from './dashboard.types';

function money(value: number) { return `¥${value.toFixed(2)}`; }
function localDate(date: Date) { const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0'); return `${date.getFullYear()}-${month}-${day}`; }
export function currentRange(now = new Date()): DateRange { return { from: localDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: localDate(now) }; }

export function DashboardPage() {
  const { profile } = useAuth();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { const range = currentRange(); void Promise.all([getDashboard(range), listLowStockProducts()]).then(([summary, products]) => { setDashboard(summary); setLowStock(products); }).catch((cause) => setError(cause instanceof Error ? cause.message : '首页数据加载失败')); }, []);
  if (!dashboard) return <section className="feature-page"><p className="form-hint">加载经营数据中…</p>{error && <p className="form-error" role="alert">{error}</p>}</section>;
  const owner = profile?.role === 'owner' && dashboard.role === 'owner';
  return <section className="feature-page"><div className="screen-head"><div><p className="eyebrow">经营概览</p><h1>今天也把玩具卖好</h1><p>按已完成出库订单统计本月经营数据。</p></div></div><div className="metric-grid"><article className="metric-card"><span>销售额</span><strong>{money(dashboard.salesAmount)}</strong></article>{owner && <><article className="metric-card"><span>成本</span><strong>{money(dashboard.costAmount)}</strong></article><article className="metric-card"><span>毛利润</span><strong>{money(dashboard.grossProfit)}</strong></article></>}<article className="metric-card"><span>订单数</span><strong>{dashboard.orderCount}</strong></article>{!owner && <article className="metric-card"><span>待出库</span><strong>{dashboard.pendingShipmentCount}</strong></article>}</div><div className="table-panel"><div className="panel-heading"><div><p className="eyebrow">库存提醒</p><h2>低库存玩具</h2></div></div><table><thead><tr><th>玩具</th><th>SKU</th><th>当前库存</th><th>提醒值</th></tr></thead><tbody>{lowStock.length === 0 ? <tr><td colSpan={4}>暂无低库存玩具</td></tr> : lowStock.map((product) => <tr key={product.id}><td>{product.name}</td><td>{product.sku}</td><td className="negative-number">{product.stockQty}</td><td>{product.lowStockThreshold}</td></tr>)}</tbody></table></div></section>;
}
