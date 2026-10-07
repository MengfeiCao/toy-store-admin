import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Form, Input, InputNumber, Modal, Select, Table } from 'antd';
import { listInventory, postStockAdjustment } from './inventory.api';
import type { AdjustmentType, InventoryItem } from './inventory.types';

export function StockAdjustmentPage() {
  const [rows, setRows] = useState<InventoryItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const [confirmForm] = Form.useForm<{ type: AdjustmentType; reason?: string }>();
  const [modal, modalHolder] = Modal.useModal();
  const requestId = useRef<string | null>(null);

  useEffect(() => {
    void listInventory('', false).then(setRows).catch((failure) => setError(String(failure.message ?? failure)));
  }, []);

  const submit = async (type: AdjustmentType, customReason?: string) => {
    const selected = Object.entries(quantities).filter(([, value]) => value !== 0);
    const sign = type === 'surplus' ? 1 : -1;
    const reason = type === 'manual' ? customReason!.trim() : { surplus: '盘盈', shortage: '短缺', damage: '破损' }[type];
    requestId.current ??= crypto.randomUUID();
    try {
      await postStockAdjustment({
        requestId: requestId.current,
        type,
        reason,
        items: selected.map(([productId, value]) => ({ productId, quantityDelta: type === 'manual' ? value : Math.abs(value) * sign })),
      });
      requestId.current = null;
      setQuantities({});
      setError('');
      setRows(await listInventory('', false));
    } catch (failure) {
      setError(String(failure instanceof Error ? failure.message : failure));
      throw failure;
    }
  };

  const openConfirmation = () => {
    if (!Object.values(quantities).some((value) => value !== 0)) { setError('请输入调整数量'); return; }
    setError('');
    modal.confirm({
      title: '确认库存调整',
      content: <Form form={confirmForm} layout="vertical" style={{ marginTop: 20 }}>
        <Form.Item name="type" label="调整分类" rules={[{ required: true, message: '请选择调整分类' }]}>
          <Select aria-label="调整分类" placeholder="请选择" options={[
            { value: 'surplus', label: '盘盈' },
            { value: 'shortage', label: '短缺' },
            { value: 'damage', label: '破损' },
            { value: 'manual', label: '其他' },
          ]} />
        </Form.Item>
        <Form.Item noStyle shouldUpdate={(previous, current) => previous.type !== current.type}>
          {({ getFieldValue }) => getFieldValue('type') === 'manual' ? <Form.Item name="reason" label="具体原因" rules={[{ required: true, whitespace: true, message: '请输入具体原因' }]}><Input aria-label="具体原因" /></Form.Item> : null}
        </Form.Item>
      </Form>,
      okText: '确认调整',
      cancelText: '取消',
      onOk: (close) => {
        void confirmForm.validateFields()
          .then((values) => submit(values.type, values.reason))
          .then(() => {
            confirmForm.resetFields();
            close();
          })
          .catch(() => undefined);
      },
      onCancel: () => confirmForm.resetFields(),
    });
  };

  return (
    <section className="feature-page">
      {modalHolder}
      <h1>库存调整</h1>
      <Table rowKey="id" dataSource={rows} pagination={false} columns={[
        { title: '商品', dataIndex: 'name' },
        { title: '当前库存', dataIndex: 'stockQty' },
        { title: '调整数量', render: (_, row) => <InputNumber aria-label={`调整数量-${row.name}`} value={quantities[row.id]} onChange={(value) => setQuantities({ ...quantities, [row.id]: value ?? 0 })} /> },
      ]} />
      {error && <Alert message={error} />}
      <Button type="primary" onClick={openConfirmation}>提交调整</Button>
    </section>
  );
}
