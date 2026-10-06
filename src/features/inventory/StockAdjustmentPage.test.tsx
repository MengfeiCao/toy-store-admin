import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StockAdjustmentPage } from './StockAdjustmentPage';

const mocks = vi.hoisted(() => ({ listInventory: vi.fn(), postStockAdjustment: vi.fn() }));

vi.mock('./inventory.api', () => mocks);

afterEach(() => {
  vi.clearAllMocks();
});

describe('StockAdjustmentPage', () => {
  it('chooses_shortage_in_the_confirmation_modal_and_applies_the_negative_sign', async () => {
    const user = userEvent.setup();
    mocks.listInventory.mockResolvedValue([{ id: 'p1', sku: 'J-1', name: '积木', category: '积木', stockQty: 5, status: 'active' }]);
    mocks.postStockAdjustment.mockResolvedValue('a1');
    render(<StockAdjustmentPage />);
    await screen.findByText('积木');

    expect(screen.queryByLabelText('调整类型')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('调整原因')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('调整数量-积木'), { target: { value: '2' } });
    await user.click(screen.getByRole('button', { name: '提交调整' }));

    expect(await screen.findByRole('dialog', { name: '确认库存调整' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('combobox', { name: '调整分类' }));
    await userEvent.click(await screen.findByText('短缺'));
    await user.click(screen.getByRole('button', { name: '确认调整' }));

    await waitFor(() => expect(mocks.postStockAdjustment).toHaveBeenCalledWith(expect.objectContaining({
      type: 'shortage',
      reason: '短缺',
      items: [{ productId: 'p1', quantityDelta: -2 }],
    })));
  });

  it('requires_a_custom_reason_when_the_category_is_other', async () => {
    const user = userEvent.setup();
    mocks.listInventory.mockResolvedValue([{ id: 'p1', sku: 'J-1', name: '积木', category: '积木', stockQty: 5, status: 'active' }]);
    mocks.postStockAdjustment.mockResolvedValue('a1');
    render(<StockAdjustmentPage />);
    await screen.findByText('积木');

    fireEvent.change(screen.getByLabelText('调整数量-积木'), { target: { value: '-2' } });
    await user.click(screen.getByRole('button', { name: '提交调整' }));
    await userEvent.click(screen.getByRole('combobox', { name: '调整分类' }));
    await userEvent.click(await screen.findByText('其他'));
    await user.click(screen.getByRole('button', { name: '确认调整' }));

    expect(await screen.findByText('请输入具体原因')).toBeInTheDocument();
    expect(mocks.postStockAdjustment).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('具体原因'), '盘点修正');
    await user.click(screen.getByRole('button', { name: '确认调整' }));

    await waitFor(() => expect(mocks.postStockAdjustment).toHaveBeenCalledWith(expect.objectContaining({
      type: 'manual',
      reason: '盘点修正',
      items: [{ productId: 'p1', quantityDelta: -2 }],
    })));
  });
});
