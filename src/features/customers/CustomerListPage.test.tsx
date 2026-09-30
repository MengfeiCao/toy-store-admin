import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CustomerListPage } from './CustomerListPage';

const mocks = vi.hoisted(() => ({ listCustomers: vi.fn(), deleteCustomer: vi.fn() }));
vi.mock('./customers.api', () => ({ listCustomers: mocks.listCustomers, deleteCustomer: mocks.deleteCustomer }));

describe('CustomerListPage', () => {
  it('shows_customers_and_walk_in_entry', async () => {
    mocks.listCustomers.mockResolvedValue([{ id: 'c1', name: '小明妈妈', phone: '0013800123456', address: null, remark: null }]);

    render(<CustomerListPage />);

    expect(await screen.findByText('小明妈妈')).toBeInTheDocument();
    expect(screen.getByText('散客')).toBeInTheDocument();
    expect(screen.getByText('0013800123456')).toBeInTheDocument();
  });

  it('shows_delete_error_when_customer_has_orders', async () => {
    mocks.listCustomers.mockResolvedValue([{ id: 'c1', name: '小明妈妈', phone: '13800138000', address: null, remark: null }]);
    mocks.deleteCustomer.mockRejectedValue(new Error('已有订单，不能删除'));

    render(<CustomerListPage />);
    await waitFor(() => expect(screen.getByText('小明妈妈')).toBeInTheDocument());
    await screen.findByRole('button', { name: '删除' });
    screen.getByRole('button', { name: '删除' }).click();

    expect(await screen.findByText('已有订单，不能删除')).toBeInTheDocument();
  });
});
