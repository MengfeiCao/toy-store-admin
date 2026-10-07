import { useEffect, useRef, useState } from 'react';
import { Alert, Button, InputNumber, Space, Table } from 'antd';
import { confirmStockCount, getStockCount, saveStockCountDraft } from './inventory.api';
import type { StockCountDetail } from './inventory.types';

export function StockCountDetailPage({ countId }: { countId: string }) {
  const [detail, setDetail] = useState<StockCountDetail | null>(null);
  const [error, setError] = useState('');
  const requestId = useRef<string | null>(null);

  useEffect(() => {
    void getStockCount(countId).then(setDetail).catch((reason) => setError(String(reason.message ?? reason)));
  }, [countId]);

  if (!detail) return error ? <Alert message={error} /> : <p>加载中…</p>;

  const updateQuantity = (id: string, value: number | null) => {
    setDetail({ ...detail, items: detail.items.map((item) => item.id === id ? { ...item, actualQuantity: value } : item) });
  };
  const save = () => saveStockCountDraft(detail.id, detail.items.filter((item) => item.actualQuantity !== null).map((item) => ({ itemId: item.id, actualQuantity: item.actualQuantity! })));
  const confirm = async () => {
    requestId.current ??= crypto.randomUUID();
    try {
      await save();
      await confirmStockCount(detail.id, requestId.current);
      requestId.current = null;
      setDetail(await getStockCount(countId));
    } catch (reason) {
      setError(String(reason instanceof Error ? reason.message : reason));
    }
  };

  return (
    <section className="feature-page">
      <h1>{detail.countNo}</h1>
      <Table rowKey="id" dataSource={detail.items} pagination={false} columns={[
        { title: '商品', dataIndex: 'productName' },
        { title: '账面', dataIndex: 'bookQuantity' },
        { title: '实盘', render: (_, item) => <InputNumber aria-label={`实盘-${item.productName}`} min={0} value={item.actualQuantity} onChange={(value) => updateQuantity(item.id, value)} /> },
        { title: '差异', render: (_, item) => { const difference = (item.actualQuantity ?? item.bookQuantity) - item.bookQuantity; return difference > 0 ? `+${difference}` : String(difference); } },
      ]} />
      {error && <Alert message={error} />}
      <Space>
        <Button onClick={() => void save().catch((reason) => setError(String(reason.message ?? reason)))}>保存草稿</Button>
        <Button type="primary" onClick={() => void confirm()}>确认盘点</Button>
      </Space>
    </section>
  );
}
