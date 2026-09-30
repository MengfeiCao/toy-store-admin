import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Input, InputNumber, Select, Table } from 'antd';
import { listInventory, postStockAdjustment } from './inventory.api';
import type { AdjustmentType, InventoryItem } from './inventory.types';

export function StockAdjustmentPage() {
  const [rows, setRows] = useState<InventoryItem[]>([]);
  const [type, setType] = useState<AdjustmentType>('shortage');
  const [reason, setReason] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const requestId = useRef<string | null>(null);

  useEffect(() => {
    void listInventory('', false).then(setRows).catch((failure) => setError(String(failure.message ?? failure)));
  }, []);

  const submit = async () => {
    if (!reason.trim()) { setError('请输入调整原因'); return; }
    const selected = Object.entries(quantities).filter(([, value]) => type === 'manual' ? value !== 0 : value > 0);
    if (selected.length === 0) { setError('请输入调整数量'); return; }
    const sign = type === 'surplus' ? 1 : -1;
    requestId.current ??= crypto.randomUUID();
    try {
      await postStockAdjustment({
        requestId: requestId.current,
        type,
        reason: reason.trim(),
        items: selected.map(([productId, value]) => ({ productId, quantityDelta: type === 'manual' ? value : value * sign })),
      });
      requestId.current = null;
      setQuantities({});
      setReason('');
      setError('');
      setRows(await listInventory('', false));
    } catch (failure) {
      setError(String(failure instanceof Error ? failure.message : failure));
    }
  };

  return (
    <section className="feature-page">
      <h1>库存调整</h1>
      <Select aria-label="调整类型" value={type} onChange={(value: AdjustmentType) => setType(value)} options={[
        { value: 'surplus', label: '盘盈' },
        { value: 'shortage', label: '短缺' },
        { value: 'damage', label: '破损' },
        { value: 'manual', label: '手工调整' },
      ]} />
      <Input aria-label="调整原因" value={reason} onChange={(event) => setReason(event.target.value)} />
      <Table rowKey="id" dataSource={rows} pagination={false} columns={[
        { title: '商品', dataIndex: 'name' },
        { title: '当前库存', dataIndex: 'stockQty' },
        { title: '调整数量', render: (_, row) => <InputNumber aria-label={`调整数量-${row.name}`} min={type === 'manual' ? undefined : 0} value={quantities[row.id]} onChange={(value) => setQuantities({ ...quantities, [row.id]: value ?? 0 })} /> },
      ]} />
      {error && <Alert message={error} />}
      <Button type="primary" onClick={() => void submit()}>提交调整</Button>
    </section>
  );
}
