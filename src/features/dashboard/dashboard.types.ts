export interface DateRange { from: string; to: string; }
export interface LowStockProduct { id: string; sku: string; name: string; stockQty: number; lowStockThreshold: number; }
export interface OwnerDashboard { role: 'owner'; salesAmount: number; costAmount: number; grossProfit: number; orderCount: number; pendingShipmentCount?: number; }
export interface StaffDashboard { role: 'staff'; salesAmount: number; orderCount: number; pendingShipmentCount: number; }
export type Dashboard = OwnerDashboard | StaffDashboard;
