import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PurchaseReceiptListPage } from './PurchaseReceiptListPage';

const mocks = vi.hoisted(() => ({ listPurchaseReceipts: vi.fn(), listSuppliers: vi.fn() }));
vi.mock('./purchases.api', () => ({ listPurchaseReceipts: mocks.listPurchaseReceipts }));
vi.mock('../suppliers/suppliers.api', () => ({ listSuppliers: mocks.listSuppliers }));

describe('PurchaseReceiptListPage', () => {
  beforeEach(() => {
    mocks.listSuppliers.mockResolvedValue([]);
    mocks.listPurchaseReceipts.mockResolvedValue([{ id: 'r1', receiptNo: 'DH-001', purchaseOrderId: 'o1', purchaseOrderNo: 'CG-001', supplierName: '童趣贸易', receivedAt: '2026-10-01', totalQuantity: 4 }]);
  });

  it('shows_receipt_history_and_filters', async () => {
    render(<PurchaseReceiptListPage />);

    expect(await screen.findByText('DH-001')).toBeInTheDocument();
    expect(screen.getByText('CG-001')).toBeInTheDocument();
    expect(screen.getByText('4 件')).toBeInTheDocument();
    expect(screen.getByLabelText('到货日期')).toBeInTheDocument();
  });
});
