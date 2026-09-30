import { AppError, toAppError } from '../../lib/app-error';
import { supabase } from '../../lib/supabase';
import type { SupplierFilters, SupplierInput, SupplierListItem, SupplierStatus } from './supplier.types';

type SupplierRow = {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  address: string | null;
  remark: string | null;
  status: SupplierStatus;
  created_at: string;
};

function payload(input: SupplierInput) {
  return {
    name: input.name.trim(),
    contact_name: input.contactName?.trim() || null,
    phone: input.phone?.trim() || null,
    address: input.address?.trim() || null,
    remark: input.remark?.trim() || null,
  };
}

function mapSupplier(row: SupplierRow): SupplierListItem {
  return {
    id: row.id,
    name: row.name,
    contactName: row.contact_name,
    phone: row.phone,
    address: row.address,
    remark: row.remark,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function listSuppliers(filters: SupplierFilters): Promise<SupplierListItem[]> {
  let request = supabase.from('suppliers').select('id,name,contact_name,phone,address,remark,status,created_at').order('created_at', { ascending: false });
  const query = filters.query?.trim();
  if (query) request = request.or(`name.ilike.%${query}%,contact_name.ilike.%${query}%,phone.ilike.%${query}%`);
  if (filters.status && filters.status !== 'all') request = request.eq('status', filters.status);
  const { data, error } = await request;
  if (error) throw toAppError(error);
  return ((data ?? []) as SupplierRow[]).map(mapSupplier);
}

export async function createSupplier(input: SupplierInput): Promise<string> {
  if (!input.name.trim()) throw new AppError('供应商名称不能为空');
  const { data, error } = await supabase.from('suppliers').insert(payload(input)).select('id').single();
  if (error) throw toAppError(error);
  return String(data.id);
}

export async function updateSupplier(id: string, input: SupplierInput): Promise<void> {
  if (!input.name.trim()) throw new AppError('供应商名称不能为空');
  const { error } = await supabase.from('suppliers').update(payload(input)).eq('id', id);
  if (error) throw toAppError(error);
}

export async function setSupplierStatus(id: string, status: SupplierStatus): Promise<void> {
  const { error } = await supabase.from('suppliers').update({ status }).eq('id', id);
  if (error) throw toAppError(error);
}
