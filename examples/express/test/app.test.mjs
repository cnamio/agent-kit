// Offline tests: the Cnamio API is a fake `fetch`, so nothing leaves the machine. `npm run smoke` runs against the real sandbox.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { createApp } from '../server.mjs';
import { createCnamio } from '../lib/cnamio-client.mjs';

function fakeCnamio() {
  const calls = [];
  const fetch = async (url, init = {}) => {
    const u = new URL(String(url));
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ method: init.method, path: u.pathname + u.search, headers: init.headers ?? {}, body });
    const json = (status, payload) => Response.json(payload, { status });
    if (u.pathname === '/v1/agent/sandbox') return json(201, { application_id: 'app_sandbox_test', auth_token: 'sandbox-session', expires_at: new Date(Date.now() + 1_800_000).toISOString() });
    if (u.pathname === '/token') return json(200, { auth_token: 'app-session' });
    if (u.pathname === '/checkdomain') {
      return json(200, { domain: body.domain, provider: 'sandbox', connectMethods: ['api_token'], records: body.dnsRecords,
        recordConflicts: body.domain.startsWith('conflict.') ? [{ type: 'CNAME', host: body.domain, reason: 'name_occupied', existing: [] }] : [] });
    }
    if (u.pathname === '/connect') return json(201, { job_id: `job_${randomUUID()}`, status: 'pending', domain: body.domain, records: body.dnsRecords });
    if (u.pathname === '/connect/automatic') {
      return body.providerToken === 'invalid' ? json(422, { message: 'The DNS provider rejected the access token.' })
        : json(201, { job_id: `job_${randomUUID()}`, status: 'pending', domain: body.domain, written: true });
    }
    const status = /^\/connect\/(job_[0-9a-f-]{36})\/status$/.exec(u.pathname);
    if (status) return json(200, { job_id: status[1], domain: 'shop.example.com', status: 'completed', connected: true, health: 'healthy' });
    return json(404, { message: 'Not found.' });
  };
  return { calls, fetch };
}

async function serve(t, env, options = {}) {
  const fake = fakeCnamio();
  const server = createApp({ client: createCnamio({ env, fetch: fake.fetch }), ...options }).listen(0);
  t.after(() => server.close());
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = async (path, body) => {
    const r = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return { status: r.status, body: await r.json() };
  };
  return { ...fake, base, post };
}

test('without credentials: a sandbox session, sent as Bearer with the sandbox application id; the secret never leaves', async t => {
  const app = await serve(t, {});
  assert.deepEqual(await (await fetch(`${app.base}/api/mode`)).json(), { mode: 'sandbox' });
  const r = await app.post('/api/domains', { domain: 'Shop.Example.com' });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.setup, 'manual');
  assert.equal(r.body.domain, 'shop.example.com');
  assert.deepEqual(r.body.records.map(x => x.type), ['CNAME', 'TXT'], 'a CNAME plus the per-user ownership TXT');
  assert.equal(app.calls[0].path, '/v1/agent/sandbox?utm_source=agent-kit');
  assert.ok(!app.calls.some(c => c.path === '/token'), 'no session request with a secret');
  const check = app.calls.find(c => c.path === '/checkdomain');
  assert.equal(check.headers.Authorization, 'Bearer sandbox-session');
  assert.equal(check.headers.applicationId, 'app_sandbox_test');
  assert.doesNotMatch(JSON.stringify(app.calls), /not-used-in-sandbox/);
  const s = await (await fetch(`${app.base}/api/domains/${r.body.jobId}`)).json();
  assert.equal(s.connected, true);
});

test('with credentials: the SDK asks /token with your application and uses its session', async t => {
  const app = await serve(t, { CNAMIO_APPLICATION_ID: 'app_test_example', CNAMIO_SECRET: 'example-secret-for-tests', CNAMIO_OWNERSHIP_KEY: 'k'.repeat(32) });
  const r = await app.post('/api/domains', { domain: 'links.example.org' });
  assert.equal(r.status, 201);
  assert.equal(r.body.mode, 'credentials');
  const token = app.calls.find(c => c.path === '/token');
  assert.equal(token.body.applicationId, 'app_test_example');
  assert.equal(app.calls.find(c => c.path === '/checkdomain').headers.Authorization, 'Bearer app-session');
  assert.ok(!app.calls.some(c => c.path.startsWith('/v1/agent/')));
});

test('with credentials but no ownership key: refused before anything is sent', async t => {
  const app = await serve(t, { CNAMIO_APPLICATION_ID: 'app_test_example', CNAMIO_SECRET: 'example-secret-for-tests' });
  const r = await app.post('/api/domains', { domain: 'links.example.org' });
  assert.equal(r.status, 500);
  assert.equal(r.body.error, 'not_configured');
  assert.match(r.body.message, /CNAMIO_OWNERSHIP_KEY/);
  assert.equal(app.calls.length, 0);
});

test('a provider token connects automatically; a refused one says so; a bad domain is refused locally', async t => {
  const app = await serve(t, {});
  const auto = await app.post('/api/domains', { domain: 'shop.example.com', providerToken: 'user-token' });
  assert.equal(auto.body.setup, 'automatic');
  assert.equal(app.calls.find(c => c.path === '/connect/automatic').body.providerToken, 'user-token');
  const refused = await app.post('/api/domains', { domain: 'shop.example.com', providerToken: 'invalid' });
  assert.equal(refused.status, 422);
  assert.equal(refused.body.error, 'provider_token_refused');
  const before = app.calls.length;
  assert.equal((await app.post('/api/domains', { domain: 'not a domain' })).status, 400);
  assert.equal((await fetch(`${app.base}/api/domains/nope`)).status, 400);
  assert.equal(app.calls.length, before);
});

test('webhook: verified over the raw body; a bad signature and a missing secret are refused', async t => {
  const events = [];
  const secret = 'whsec-example-for-tests';
  const app = await serve(t, {}, { webhookSecret: secret, onEvent: event => { events.push(event); } });
  const raw = JSON.stringify({ id: 'evt_1', type: 'domain.added', domain: 'shop.example.com', user_id: 'demo-user' });
  const ts = String(Math.floor(Date.now() / 1000));
  const signature = 'sha256=' + createHmac('sha256', secret).update(`${ts}.${raw}`).digest('hex');
  const hook = (headers) => fetch(`${app.base}/webhooks/cnamio`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: raw });
  assert.equal((await hook({ 'cnamio-timestamp': ts, 'cnamio-signature': signature })).status, 200);
  assert.deepEqual(events.map(e => e.type), ['domain.added']);
  assert.equal((await hook({ 'cnamio-timestamp': ts, 'cnamio-signature': 'sha256=00' })).status, 401);
  assert.equal(events.length, 1);
  const unset = await serve(t, {}, { webhookSecret: '' });
  assert.equal((await fetch(`${unset.base}/webhooks/cnamio`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: raw })).status, 503);
});
