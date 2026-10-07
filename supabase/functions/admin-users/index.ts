import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

type UserDeps = { auth: { getUser: (token: string) => Promise<{ data: { user: { id: string; email?: string } | null }; error: unknown }> }; db: SupabaseClient; admin: SupabaseClient };
const headers = { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type' };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

export function dbClientOptions(token: string) {
  return { global: { headers: { Authorization: `Bearer ${token}` } } };
}

function deps(token: string): UserDeps {
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return { auth: createClient(url, anon).auth, db: createClient(url, anon, dbClientOptions(token)), admin: createClient(url, service) };
}

export async function handleRequest(request: Request, services?: UserDeps): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return response({ error: 'unauthorized' }, 401);
  const activeServices = services ?? deps(token);
  const { data: authData, error: authError } = await activeServices.auth.getUser(token);
  if (authError || !authData.user) return response({ error: 'unauthorized' }, 401);
  const { data: caller } = await activeServices.db.from('users').select('role,status').eq('id', authData.user.id).maybeSingle();
  if (!caller || caller.role !== 'owner' || caller.status !== 'active') return response({ error: 'forbidden' }, 403);
  const body = await request.json();

  if (body.action === 'list') {
    const [{ data: profiles, error: profileError }, { data: authUsers, error: authError }] = await Promise.all([activeServices.db.from('users').select('id,name,role,status,created_at').order('created_at', { ascending: false }), activeServices.admin.auth.admin.listUsers({ perPage: 1000 })]);
    if (profileError || authError) return response({ error: 'failed to list users' }, 500);
    const emails = new Map((authUsers.users ?? []).map((user) => [user.id, user.email ?? '']));
    return response({ users: (profiles ?? []).map((profile) => ({ id: profile.id, email: emails.get(profile.id) ?? '', name: profile.name, role: profile.role, status: profile.status, createdAt: profile.created_at })) });
  }
  if (body.action === 'create') {
    if (typeof body.email !== 'string' || typeof body.name !== 'string' || typeof body.password !== 'string' || !body.email.trim() || !body.name.trim() || body.password.length < 8) return response({ error: 'invalid input' }, 400);
    const { data: created, error: createError } = await activeServices.admin.auth.admin.createUser({ email: body.email.trim(), password: body.password, email_confirm: true });
    if (createError || !created.user) return response({ error: createError?.message ?? 'failed to create user' }, 400);
    const { error: profileError } = await activeServices.admin.from('users').insert({ id: created.user.id, name: body.name.trim(), role: 'staff', status: 'active' });
    if (profileError) { await activeServices.admin.auth.admin.deleteUser(created.user.id); return response({ error: 'failed to create profile' }, 500); }
    return response({ userId: created.user.id });
  }
  if (body.action === 'set-status') {
    if (typeof body.id !== 'string' || !['active', 'disabled'].includes(body.status)) return response({ error: 'invalid input' }, 400);
    if (body.id === authData.user.id && body.status === 'disabled') return response({ error: 'cannot disable current owner' }, 400);
    const { error } = await activeServices.admin.from('users').update({ status: body.status }).eq('id', body.id).eq('role', 'staff');
    return error ? response({ error: error.message }, 400) : response({ ok: true });
  }
  return response({ error: 'unsupported action' }, 400);
}

if (import.meta.main) Deno.serve((request) => handleRequest(request));
