import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { SalesOrderListPage } from './SalesOrderListPage';

const mocks = vi.hoisted(() => ({ listSalesOrders: vi.fn(), cancelSalesOrder: vi.fn() }));
vi.mock('./sales.api', () => mocks);

describe('SalesOrderListPage', () => {
  it('links_drafts_to_editing_and_confirmed_orders_to_details', async () => {
    mocks.listSalesOrders.mockResolvedValue([
      { id: 'draft-1', orderNo: 'XS-DRAFT', customerName: '散客', status: 'draft', totalAmount: 100, paymentStatus: 'unpaid', createdAt: '2026-09-30T00:00:00Z' },
      { id: 'pending-1', orderNo: 'XS-PENDING', customerName: '散客', status: 'pending_shipment', totalAmount: 100, paymentStatus: 'unpaid', createdAt: '2026-09-30T00:00:00Z' },
      { id: 'completed-1', orderNo: 'XS-COMPLETED', customerName: '散客', status: 'completed', totalAmount: 100, paymentStatus: 'paid', createdAt: '2026-09-30T00:00:00Z' },
    ]);

    render(<MemoryRouter><SalesOrderListPage /></MemoryRouter>);

    expect(await screen.findByRole('link', { name: 'XS-DRAFT' })).toHaveAttribute('href', '/sales/draft-1');
    expect(screen.getByRole('link', { name: 'XS-PENDING' })).toHaveAttribute('href', '/sales/pending-1/detail');
    expect(screen.getByRole('link', { name: 'XS-COMPLETED' })).toHaveAttribute('href', '/sales/completed-1/detail');
    expect(screen.getByRole('combobox', { name: '收款状态' })).toBeInTheDocument();
    expect(screen.getByLabelText('订单日期')).toBeInTheDocument();
  });
});
