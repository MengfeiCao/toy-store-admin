export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  remark: string | null;
}

export interface CustomerInput {
  id?: string;
  name: string;
  phone?: string;
  address?: string;
  remark?: string;
}

export interface CustomerOption {
  id: string | null;
  label: string;
}
