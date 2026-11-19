// Offline tests of what the route handlers call: the Cnamio API is a fake `fetch`, so nothing leaves the machine.
// `npm run smoke` runs against the real sandbox.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { createCnamio } from '../lib/cnamio-client.ts';
import type { Env } from '../lib/cnamio-client.ts';
import { connectDomain, connectionStatus, handleWebhook } from '../lib/domains.ts';

interface Call { method: string | undefined; path: string; headers: Record<string, string>; body: any }
function fakeCnamio() {
  const calls: Call[] = [];
  const fetch = (async (url: string | URL | Request, init: RequestInit = {}) => {
    const u = new URL(String(url));
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ method: init.method, path: u.pathname + u.search, headers: (init.headers ?? {}) as Record<string, string>, body });
    const json = (status: number, payload: unknown) => Response.json(payload, { status });
    if (u.pathname === '/v1/agent/sandbox') return json(201, { application_id: 'app_sandbox_test', auth_token: 'sandbox-session', expires_at: new Date(Date.now() + 1_800_000).toISOString() });
    if (u.pathname === '/token') return json(200, { auth_token: 'app-session' });
    if (u.pathname === '/checkdomain') return json(200, { domain: body.domain, provider: 'sandbox', connectMethods: ['api_token'], records: body.dnsRecords, recordConflicts: [] });
    if (u.pathname === '/connect') {
      if (body.userId !== undefined && calls.some(c => c.path.startsWith('/v1/agent/sandbox'))) return json(403, { message: 'Not allowed for this session.' });
      return json(201, { job_id: `job_${randomUUID()}`, status: 'pending', domain: body.domain, records: body.dnsRecords });
    }
    if (u.pathname === '/connect/automatic') {
      return body.providerToken === 'invalid' ? json(422, { message: 'The DNS provider rejected the access token.' })
        : json(201, { job_id: `job_${randomUUID()}`, status: 'pending', domain: body.domain, written: true });
    }
    const status = /^\/connect\/(job_[0-9a-f-]{36})\/status$/.exec(u.pathname);
    if (status) return json(200, { job_id: status[1], domain: 'shop.example.com', status: 'completed', connected: true, health: 'healthy' });
    return json(404, { message: 'Not found.' });
  }) as typeof globalThis.fetch;
  return { calls, fetch };
}
const client = (env: Env) => { const fake = fakeCnamio(); return { ...fake, client: createCnamio({ env, fetch: fake.fetch }) }; };

test('without credentials: a sandbox session, sent as Bearer with the sandbox application id; the secret never leaves', async () => {
  const { client: c, calls } = client({});
  assert.equal(c.mode, 'sandbox');
  const r = await connectDomain(c, { userId: 'demo-user', domain: 'Shop.Example.com' });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.domain, 'shop.example.com');
  assert.deepEqual((r.body.records as { type: string }[]).map(x => x.type), ['CNAME', 'TXT'], 'a CNAME plus the per-user ownership TXT');
  assert.equal(calls[0]!.path, '/v1/agent/sandbox?utm_source=agent-kit');
  assert.ok(!calls.some(x => x.path === '/token'));
  const check = calls.find(x => x.path === '/checkdomain')!;
  assert.equal(check.headers.Authorization, 'Bearer sandbox-session');
  assert.equal(check.headers.applicationId, 'app_sandbox_test');
  assert.equal(calls.find(x => x.path === '/connect')!.body.userId, undefined, 'a sandbox session has its own user id');
  assert.doesNotMatch(JSON.stringify(calls), /not-used-in-sandbox/);
  assert.equal((await connectionStatus(c, r.body.jobId)).body.connected, true);
});

test('with credentials: /token with your application, your user id on the job, and the ownership key required', async () => {
  const env = { CNAMIO_APPLICATION_ID: 'app_test_example', CNAMIO_SECRET: 'example-secret-for-tests' };
  const missing = client(env);
  const refused = await connectDomain(missing.client, { userId: 'u1', domain: 'links.example.org' });
  assert.equal(refused.status, 500);
  assert.equal(missing.calls.length, 0);
  const { client: c, calls } = client({ ...env, CNAMIO_OWNERSHIP_KEY: 'k'.repeat(32) });
  const r = await connectDomain(c, { userId: 'u1', domain: 'links.example.org' });
  assert.equal(r.status, 201);
  assert.equal(calls.find(x => x.path === '/token')!.body.applicationId, 'app_test_example');
  assert.equal(calls.find(x => x.path === '/connect')!.body.userId, 'u1');
});

test('a provider token connects automatically; a refused one says so; bad input is refused locally', async () => {
  const { client: c, calls } = client({});
  assert.equal((await connectDomain(c, { userId: 'u', domain: 'shop.example.com', providerToken: 'user-token' })).body.setup, 'automatic');
  assert.equal((await connectDomain(c, { userId: 'u', domain: 'shop.example.com', providerToken: 'invalid' })).status, 422);
  const before = calls.length;
  assert.equal((await connectDomain(c, { userId: 'u', domain: 'not a domain' })).status, 400);
  assert.equal((await connectionStatus(c, 'nope')).status, 400);
  assert.equal(calls.length, before);
});

test('webhook: verified over the raw body; a bad signature and a missing secret are refused', async () => {
  const secret = 'whsec-example-for-tests';
  const raw = JSON.stringify({ id: 'evt_1', type: 'domain.added', domain: 'shop.example.com', user_id: 'demo-user' });
  const ts = String(Math.floor(Date.now() / 1000));
  const signature = 'sha256=' + createHmac('sha256', secret).update(`${ts}.${raw}`).digest('hex');
  const seen: string[] = [];
  const onEvent = (event: { type: string }) => { seen.push(event.type); };
  assert.equal((await handleWebhook(raw, new Headers({ 'cnamio-timestamp': ts, 'cnamio-signature': signature }), onEvent, secret)).status, 200);
  assert.equal((await handleWebhook(raw, new Headers({ 'cnamio-timestamp': ts, 'cnamio-signature': 'sha256=00' }), onEvent, secret)).status, 401);
  assert.equal((await handleWebhook(raw, new Headers(), onEvent, '')).status, 503);
  assert.deepEqual(seen, ['domain.added']);
});
