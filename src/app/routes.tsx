import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { LoginPage } from '../auth/LoginPage';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { AppShell } from './AppShell';
import { ProductListPage } from '../features/products/ProductListPage';
import { StockInPage } from '../features/stock/StockInPage';
import { StockLedgerPage } from '../features/stock/StockLedgerPage';
import { CustomerListPage } from '../features/customers/CustomerListPage';
import { SalesOrderListPage } from '../features/sales/SalesOrderListPage';
import { SalesOrderEditPage } from '../features/sales/SalesOrderEditPage';
import { SalesOrderDetailPage } from '../features/sales/SalesOrderDetailPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { UserManagementPage } from '../features/users/UserManagementPage';
import { SupplierListPage } from '../features/suppliers/SupplierListPage';
import { PurchaseOrderListPage } from '../features/purchases/PurchaseOrderListPage';
import { PurchaseOrderEditPage } from '../features/purchases/PurchaseOrderEditPage';
import { PurchaseOrderDetailPage } from '../features/purchases/PurchaseOrderDetailPage';
import { PurchaseReceiptListPage } from '../features/purchases/PurchaseReceiptListPage';
import { InventoryPage } from '../features/inventory/InventoryPage';
import { StockAlertsPage } from '../features/inventory/StockAlertsPage';
import { StockCountListPage } from '../features/inventory/StockCountListPage';
import { StockCountDetailPage } from '../features/inventory/StockCountDetailPage';
import { StockAdjustmentPage } from '../features/inventory/StockAdjustmentPage';
import { AfterSalesListPage } from '../features/after-sales/AfterSalesListPage';
import { AfterSalesCreatePage } from '../features/after-sales/AfterSalesCreatePage';
import { AfterSalesDetailPage } from '../features/after-sales/AfterSalesDetailPage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { QuickSalePage } from '../features/sales/QuickSalePage';
import { ReceiptPage } from '../features/sales/ReceiptPage';
import { useAuth } from '../auth/AuthProvider';

function PlaceholderPage({ title }: { title: string }) {
  return <section className="placeholder-page"><p className="eyebrow">乐奇玩具</p><h1>{title}</h1><p>此页面将在后续 task 中接入真实业务模块。</p></section>;
}

function SalesOrderEditRoute() {
  const { id } = useParams();
  return <SalesOrderEditPage orderId={id} />;
}

function SalesOrderDetailRoute() {
  const { id = '' } = useParams();
  const { profile } = useAuth();
  return <SalesOrderDetailPage orderId={id} role={profile?.role ?? 'staff'} />;
}

function ReceiptRoute() {
  const { id = '' } = useParams();
  return <ReceiptPage orderId={id} />;
}

function PurchaseOrderEditRoute() {
  const { id } = useParams();
  return <PurchaseOrderEditPage orderId={id} />;
}

function PurchaseOrderDetailRoute() {
  const { id = '' } = useParams();
  return <PurchaseOrderDetailPage orderId={id} />;
}

function StockCountDetailRoute() {
  const { id = '' } = useParams();
  return <StockCountDetailPage countId={id} />;
}

function AfterSalesCreateRoute() {
  const { id = '' } = useParams();
  return <AfterSalesCreatePage orderId={id} />;
}

function AfterSalesDetailRoute() {
  const { id = '' } = useParams();
  return <AfterSalesDetailPage id={id} />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/products" element={<ProductListPage />} />
          <Route path="/stock-in" element={<StockInPage />} />
          <Route path="/records" element={<StockLedgerPage />} />
          <Route path="/customers" element={<CustomerListPage />} />
          <Route path="/suppliers" element={<SupplierListPage />} />
          <Route path="/purchases" element={<PurchaseOrderListPage />} />
          <Route path="/purchases/new" element={<PurchaseOrderEditPage />} />
          <Route path="/purchases/:id" element={<PurchaseOrderEditRoute />} />
          <Route path="/purchases/:id/detail" element={<PurchaseOrderDetailRoute />} />
          <Route path="/purchase-receipts" element={<PurchaseReceiptListPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/stock-alerts" element={<StockAlertsPage />} />
          <Route path="/stock-counts" element={<StockCountListPage />} />
          <Route path="/stock-counts/:id" element={<StockCountDetailRoute />} />
          <Route path="/stock-adjustments" element={<StockAdjustmentPage />} />
          <Route path="/sales" element={<SalesOrderListPage />} />
          <Route path="/quick-sale" element={<QuickSalePage />} />
          <Route path="/sales/new" element={<SalesOrderEditPage />} />
          <Route path="/sales/:id" element={<SalesOrderEditRoute />} />
          <Route path="/sales/:id/detail" element={<SalesOrderDetailRoute />} />
          <Route path="/sales/:id/receipt" element={<ReceiptRoute />} />
          <Route path="/sales/:id/after-sales" element={<AfterSalesCreateRoute />} />
          <Route path="/after-sales" element={<AfterSalesListPage />} />
          <Route path="/after-sales/:id" element={<AfterSalesDetailRoute />} />
          <Route path="/users" element={<ProtectedRoute allow={['owner']}><UserManagementPage /></ProtectedRoute>} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
