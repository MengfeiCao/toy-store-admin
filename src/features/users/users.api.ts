import { toAppError } from '../../lib/app-error';
import { supabase } from '../../lib/supabase';
import type { CreateStaffInput, ManagedUser, ManagedUserStatus } from './users.types';

async function invoke(body: Record<string, unknown>): Promise<{ users?: ManagedUser[]; userId?: string }> {
  const { data, error } = await supabase.functions.invoke('admin-users', { body });
  if (error) throw toAppError(error);
  return data as { users?: ManagedUser[]; userId?: string };
}

export async function listUsers(): Promise<ManagedUser[]> {
  const result = await invoke({ action: 'list' });
  return result.users ?? [];
}

export async function createStaff(input: CreateStaffInput): Promise<string> {
  if (!input.email.trim() || !input.name.trim() || !input.password) throw new Error('请填写邮箱、姓名和密码');
  const result = await invoke({ action: 'create', email: input.email.trim(), name: input.name.trim(), password: input.password });
  return result.userId ?? '';
}

export async function setUserStatus(id: string, status: ManagedUserStatus): Promise<void> {
  await invoke({ action: 'set-status', id, status });
}
