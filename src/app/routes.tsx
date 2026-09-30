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

function PlaceholderPage({ title }: { title: string }) {
  return <section className="placeholder-page"><p className="eyebrow">乐奇玩具</p><h1>{title}</h1><p>此页面将在后续 task 中接入真实业务模块。</p></section>;
}

function SalesOrderEditRoute() {
  const { id } = useParams();
  return <SalesOrderEditPage orderId={id} />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<PlaceholderPage title="经营概览" />} />
          <Route path="/products" element={<ProductListPage />} />
          <Route path="/stock-in" element={<StockInPage />} />
          <Route path="/records" element={<StockLedgerPage />} />
          <Route path="/customers" element={<CustomerListPage />} />
          <Route path="/sales" element={<SalesOrderListPage />} />
          <Route path="/sales/new" element={<SalesOrderEditPage />} />
          <Route path="/sales/:id" element={<SalesOrderEditRoute />} />
          <Route path="/users" element={<ProtectedRoute allow={['owner']}><PlaceholderPage title="用户管理" /></ProtectedRoute>} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
