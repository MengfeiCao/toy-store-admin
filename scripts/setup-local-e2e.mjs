import { execFileSync } from 'node:child_process';

const status = JSON.parse(execFileSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8' }));
const headers = {
  apikey: status.SERVICE_ROLE_KEY,
  Authorization: `Bearer ${status.SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};
const password = 'ToyStoreE2E!2026';
const accounts = [
  { email: 'owner.e2e@toy-store.local', name: '自动验收店主', role: 'owner' },
  { email: 'staff.e2e@toy-store.local', name: '自动验收店员', role: 'staff' },
];

const usersResponse = await fetch(`${status.API_URL}/auth/v1/admin/users?per_page=1000`, { headers });
if (!usersResponse.ok) throw new Error(`读取本地验收账号失败：${usersResponse.status}`);
const existingUsers = (await usersResponse.json()).users;

for (const account of accounts) {
  let user = existingUsers.find((item) => item.email === account.email);
  const authResponse = await fetch(user ? `${status.API_URL}/auth/v1/admin/users/${user.id}` : `${status.API_URL}/auth/v1/admin/users`, {
    method: user ? 'PUT' : 'POST',
    headers,
    body: JSON.stringify({ email: account.email, password, email_confirm: true }),
  });
  if (!authResponse.ok) throw new Error(`准备 ${account.role} 验收账号失败：${authResponse.status}`);
  user = await authResponse.json();

  const profileResponse = await fetch(`${status.REST_URL}/users?on_conflict=id`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: user.id, name: account.name, role: account.role, status: 'active' }),
  });
  if (!profileResponse.ok) throw new Error(`写入 ${account.role} 验收资料失败：${profileResponse.status}`);
}

console.log('本地店主与店员验收账号已就绪。');
