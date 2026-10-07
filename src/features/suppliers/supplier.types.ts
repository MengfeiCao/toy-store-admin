export type SupplierStatus = 'active' | 'inactive';

export interface SupplierListItem {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  address: string | null;
  remark: string | null;
  status: SupplierStatus;
  createdAt: string;
}

export interface SupplierInput {
  name: string;
  contactName?: string;
  phone?: string;
  address?: string;
  remark?: string;
}

export interface SupplierFilters {
  query?: string;
  status?: SupplierStatus | 'all';
}
