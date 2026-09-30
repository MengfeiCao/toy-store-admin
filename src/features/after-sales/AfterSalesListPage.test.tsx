import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AfterSalesListPage } from './AfterSalesListPage';

const mocks = vi.hoisted(() => ({ listAfterSales: vi.fn() }));
vi.mock('./after-sales.api', () => mocks);

describe('AfterSalesListPage', () => {
  it('shows_refund_and_source_order', async () => {
    mocks.listAfterSales.mockResolvedValue([{ id: 'as-1', afterSalesNo: 'SH-1', salesOrderId: 'so-1', salesOrderNo: 'XS-1', customerName: '散客', type: 'return', totalQuantity: 2, refundAmount: 40, completedAt: '2026-10-01' }]);
    render(<MemoryRouter><AfterSalesListPage /></MemoryRouter>);
    expect(await screen.findByText('SH-1')).toBeInTheDocument();
    expect(screen.getByText('¥40.00')).toBeInTheDocument();
  });
});
