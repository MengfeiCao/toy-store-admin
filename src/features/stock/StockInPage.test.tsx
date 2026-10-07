import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StockInPage } from './StockInPage';

const mocks = vi.hoisted(() => ({ listStockInHistory: vi.fn() }));
vi.mock('./stock.api', () => mocks);

describe('StockInPage', () => {
  it('shows_legacy_history_without_write_actions', async () => {
    mocks.listStockInHistory.mockResolvedValue([{ id: 'in-1', orderNo: 'RK-001', status: 'posted', totalQuantity: 10, createdAt: '2026-01-01' }]);
    render(<StockInPage />);
    expect(await screen.findByText('RK-001')).toBeInTheDocument();
    expect(screen.getByText('历史手工入库')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '确认入库' })).not.toBeInTheDocument();
  });
});
