import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { AppRole } from './auth.types';
import { useAuth } from './AuthProvider';

export function ProtectedRoute({ allow, children }: { allow?: AppRole[]; children?: ReactNode }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="route-state"><div><h1>玩具销售后台</h1><p>加载中…</p></div></div>;
  if (!user || !profile) return <Navigate to="/login" replace state={{ from: location }} />;
  if (allow && !allow.includes(profile.role)) return <div className="route-state" role="alert">无权限</div>;
  return children ? <>{children}</> : <Outlet />;
}
