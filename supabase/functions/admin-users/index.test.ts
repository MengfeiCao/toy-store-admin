import { assertEquals } from 'https://deno.land/std@0.224.0/assert/assert_equals.ts';
import { handleRequest } from './index.ts';

Deno.test('returns 401 without bearer token', async () => {
  const response = await handleRequest(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ action: 'list' }) }), {} as never);
  assertEquals(response.status, 401);
});
