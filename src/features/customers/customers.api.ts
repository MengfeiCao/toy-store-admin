import { AppError, toAppError } from '../../lib/app-error';
import { supabase } from '../../lib/supabase';
import type { Customer, CustomerInput, CustomerOption } from './customer.types';

function mapCustomer(row: Customer): Customer {
  return { id: row.id, name: row.name, phone: row.phone ?? null, address: row.address ?? null, remark: row.remark ?? null };
}

export async function listCustomers(query: string): Promise<Customer[]> {
  const request = supabase.from('customers').select('id,name,phone,address,remark').order('created_at', { ascending: false });
  const result = query.trim() ? await request.or(`name.ilike.%${query.trim()}%,phone.ilike.%${query.trim()}%`) : await request;
  if (result.error) throw toAppError(result.error);
  return ((result.data ?? []) as Customer[]).map(mapCustomer);
}

export async function saveCustomer(input: CustomerInput): Promise<string> {
  if (!input.name.trim()) throw new AppError('客户姓名不能为空');
  const payload = { name: input.name.trim(), phone: input.phone?.trim() || null, address: input.address?.trim() || null, remark: input.remark?.trim() || null };
  if (input.id) {
    const { error } = await supabase.from('customers').update(payload).eq('id', input.id);
    if (error) throw toAppError(error);
    return input.id;
  }
  const { data, error } = await supabase.from('customers').insert(payload).select('id').single();
  if (error) throw toAppError(error);
  return String(data.id);
}

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (!error) return;
  if (error.code === '23503' || error.message?.toLowerCase().includes('foreign key')) throw new AppError('已有订单，不能删除');
  throw toAppError(error);
}

export function toCustomerOptions(customers: Customer[]): CustomerOption[] {
  return [{ id: null, label: '散客' }, ...customers.map((customer) => ({ id: customer.id, label: customer.name }))];
}
