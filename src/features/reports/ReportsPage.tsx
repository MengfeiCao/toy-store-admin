import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Input, Row, Space, Statistic, Table, Tabs } from 'antd';
import type { EChartsOption } from 'echarts';
import { getBusinessReport } from './reports.api';
import { exportReport } from './report-export';
import { ReportChart } from './ReportChart';
import type { BusinessReport, DailyReport, ReportRange } from './reports.types';

function localDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function defaultReportRange(now = new Date()): ReportRange {
  return { from: localDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: localDate(now) };
}

function money(value?: number) { return `¥${Number(value ?? 0).toFixed(2)}`; }

function dailyOption(rows: DailyReport[]): EChartsOption {
  return {
    tooltip: { trigger: 'axis' }, legend: { data: ['净销售额', '退款金额'] },
    xAxis: { type: 'category', data: rows.map((row) => row.date.slice(5)) }, yAxis: { type: 'value' },
    series: [
      { name: '净销售额', type: 'line', smooth: true, data: rows.map((row) => row.netSales) },
      { name: '退款金额', type: 'bar', data: rows.map((row) => row.refundAmount) },
    ],
  };
}

function monthlyRows(rows: DailyReport[]) {
  const months = new Map<string, DailyReport>();
  for (const row of rows) {
    const month = row.date.slice(0, 7);
    const current = months.get(month) ?? { date: month, grossSales: 0, refundAmount: 0, netSales: 0, orderCount: 0, ...(row.netCost !== undefined ? { netCost: 0, grossProfit: 0 } : {}) };
    current.grossSales += row.grossSales; current.refundAmount += row.refundAmount; current.netSales += row.netSales; current.orderCount += row.orderCount;
    if (row.netCost !== undefined) current.netCost = (current.netCost ?? 0) + row.netCost;
    if (row.grossProfit !== undefined) current.grossProfit = (current.grossProfit ?? 0) + row.grossProfit;
    months.set(month, current);
  }
  return [...months.values()];
}

export function ReportsPage() {
  const [range, setRange] = useState(defaultReportRange);
  const [report, setReport] = useState<BusinessReport | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function load(next = range) {
    if (!next.from || !next.to || next.from > next.to) { setError('请选择有效的开始和结束日期'); return; }
    setLoading(true); setError('');
    try { setReport(await getBusinessReport(next)); } catch (reason) { setError(reason instanceof Error ? reason.message : '报表加载失败'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(range); }, []);
  const chartOption = useMemo(() => dailyOption(report?.daily ?? []), [report]);
  const owner = report?.role === 'owner';

  const dailyColumns = [
    { title: '日期', dataIndex: 'date' }, { title: '销售额', dataIndex: 'grossSales', render: money },
    { title: '退款', dataIndex: 'refundAmount', render: money }, { title: '净销售额', dataIndex: 'netSales', render: money },
    { title: '订单数', dataIndex: 'orderCount' },
    ...(owner ? [{ title: '净成本', dataIndex: 'netCost', render: money }, { title: '毛利润', dataIndex: 'grossProfit', render: money }] : []),
  ];

  return <section className="feature-page report-page">
    <div className="screen-head"><div><p className="eyebrow">经营分析</p><h1>经营报表</h1><p>销售、库存、采购和售后共用统一统计口径。</p></div><Button type="primary" disabled={!report} onClick={() => report && exportReport(report)}>导出 Excel</Button></div>
    <Space className="report-filter" wrap>
      <Input type="date" aria-label="开始日期" value={range.from} onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))} />
      <span>至</span>
      <Input type="date" aria-label="结束日期" value={range.to} onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))} />
      <Button loading={loading} onClick={() => void load()}>查询</Button>
    </Space>
    {error && <Alert type="error" showIcon message={error} />}
    {report && <>
      <Row gutter={[12, 12]} className="report-metrics">
        <Col xs={12} md={6}><Card><Statistic title="销售额" value={report.summary.grossSales} precision={2} prefix="¥" /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="退款金额" value={report.summary.refundAmount} precision={2} prefix="¥" /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="净销售额" value={report.summary.netSales} precision={2} prefix="¥" /></Card></Col>
        {owner ? <Col xs={12} md={6}><Card><Statistic title="毛利润" value={report.summary.grossProfit} precision={2} prefix="¥" /></Card></Col> : <Col xs={12} md={6}><Card><Statistic title="订单数" value={report.summary.orderCount} /></Card></Col>}
      </Row>
      <Tabs items={[
        { key: 'daily', label: '日报', children: <><ReportChart option={chartOption} /><Table rowKey="date" dataSource={report.daily} columns={dailyColumns} pagination={false} size="small" /></> },
        { key: 'monthly', label: '月报', children: <Table rowKey="date" dataSource={monthlyRows(report.daily)} columns={dailyColumns} pagination={false} size="small" /> },
        { key: 'products', label: '商品排行', children: <Table rowKey="productId" dataSource={report.products} pagination={false} size="small" columns={[
          { title: '商品', dataIndex: 'productName' }, { title: 'SKU', dataIndex: 'sku' }, { title: '销量', dataIndex: 'quantity' },
          { title: '净销售额', dataIndex: 'netSales', render: money }, ...(owner ? [{ title: '净成本', dataIndex: 'netCost', render: money }, { title: '毛利润', dataIndex: 'grossProfit', render: money }] : []),
        ]} /> },
        { key: 'inventory', label: '库存分析', children: <><Row gutter={[12, 12]}><Col span={8}><Card><Statistic title="库存总量" value={report.inventory.totalQuantity} /></Card></Col><Col span={8}><Card><Statistic title="低库存商品" value={report.inventory.lowStockCount} /></Card></Col><Col span={8}><Card><Statistic title="报损数量" value={report.inventory.damageQuantity} /></Card></Col></Row><h3>30 天滞销商品</h3><Table rowKey="id" dataSource={report.slowMoving} pagination={false} size="small" columns={[{ title: '商品', dataIndex: 'name' }, { title: 'SKU', dataIndex: 'sku' }, { title: '库存', dataIndex: 'stockQty' }, { title: '最近销售', dataIndex: 'lastSoldAt', render: (value: string | null) => value ? new Date(value).toLocaleString() : '从未销售' }]} /></> },
        { key: 'purchases', label: '采购分析', children: <Row gutter={[12, 12]}><Col span={6}><Card><Statistic title="采购金额" value={report.purchases.purchaseAmount} prefix="¥" precision={2} /></Card></Col><Col span={6}><Card><Statistic title="到货数量" value={report.purchases.receivedQuantity} /></Card></Col><Col span={6}><Card><Statistic title="付款金额" value={report.purchases.paidAmount} prefix="¥" precision={2} /></Card></Col><Col span={6}><Card><Statistic title="当前未付" value={report.purchases.unpaidAmount} prefix="¥" precision={2} /></Card></Col></Row> },
        { key: 'after-sales', label: '售后分析', children: <Row gutter={[12, 12]}><Col span={6}><Card><Statistic title="退货数量" value={report.afterSales.returnQuantity} /></Card></Col><Col span={6}><Card><Statistic title="换货数量" value={report.afterSales.exchangeQuantity} /></Card></Col><Col span={6}><Card><Statistic title="损坏数量" value={report.afterSales.damageQuantity} /></Card></Col><Col span={6}><Card><Statistic title="退款金额" value={report.afterSales.refundAmount} prefix="¥" precision={2} /></Card></Col></Row> },
      ]} />
    </>}
  </section>;
}
