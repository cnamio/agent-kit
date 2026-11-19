// Server only. The app's Cnamio client: the server SDK with your credentials, or the Cnamio agent sandbox without them.
//
// - CNAMIO_APPLICATION_ID and CNAMIO_SECRET set: the real test (or live) application.
// - Not set: a 30-minute sandbox session from POST https://api.cnamio.com/v1/agent/sandbox, renewed when it expires.
//   No account, nothing real read or written: any domain connects, conflict.<domain> has a record in the way,
//   pending.<domain> never propagates. The sandbox has no webhooks and no management API.
//
// The app code is the same in both modes: only how the SDK gets its session token changes (see sandboxFetch).
import { Cnamio, recordsForUser } from './cnamio-sdk/cnamio.mjs';
import type { DnsRecord } from './cnamio-sdk/cnamio.mjs';

export type Env = Record<string, string | undefined>;
export type Mode = 'credentials' | 'sandbox';
export interface CnamioClient { readonly mode: Mode; readonly cnamio: Cnamio; recordsFor(userId: string): DnsRecord[] }

export const DEFAULT_BASE_URL = 'https://api.cnamio.com';
/** `utm_source` tells Cnamio which channel the sandbox session came from (aggregated counts only). */
export const SANDBOX_PATH = '/v1/agent/sandbox?utm_source=agent-kit';

export function createCnamio({ env = process.env, fetch = globalThis.fetch }: { env?: Env; fetch?: typeof globalThis.fetch } = {}): CnamioClient {
  const baseUrl = (env.CNAMIO_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  if (env.CNAMIO_APPLICATION_ID && env.CNAMIO_SECRET) {
    const cnamio = new Cnamio({ applicationId: env.CNAMIO_APPLICATION_ID, secret: env.CNAMIO_SECRET, baseUrl, fetch });
    return { mode: 'credentials', cnamio, recordsFor: userId => recordsFor(userId, 'credentials', env) };
  }
  // The SDK needs an id and a secret to start; in sandbox mode neither is ever sent: /token is answered below.
  const cnamio = new Cnamio({ applicationId: 'app_sandbox', secret: 'not-used-in-sandbox', baseUrl, fetch: sandboxFetch(fetch, baseUrl) });
  return { mode: 'sandbox', cnamio, recordsFor: userId => recordsFor(userId, 'sandbox', env) };
}

/**
 * A fetch for the SDK that swaps its session request (POST /token with the secret) for a sandbox session, and sends the
 * sandbox application's id on every other call. Everything else goes to Cnamio unchanged.
 */
function sandboxFetch(fetch: typeof globalThis.fetch, baseUrl: string): typeof globalThis.fetch {
  let applicationId: string | null = null;
  return async (url, init = {}) => {
    if (String(url) === `${baseUrl}/token`) {
      const response = await fetch(baseUrl + SANDBOX_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ client: { name: 'cnamio-agent-kit' } }),
        signal: init.signal ?? null,
      });
      if (!response.ok) return response;
      const session = await response.json() as { application_id: string; auth_token: string; expires_at: string };
      applicationId = session.application_id;
      return Response.json({ auth_token: session.auth_token, expires_at: session.expires_at });
    }
    const headers = { ...(init.headers as Record<string, string> | undefined), ...(applicationId ? { applicationId } : {}) };
    return fetch(url, { ...init, headers });
  };
}

/**
 * The records a user's domain needs: a CNAME to your hosting plus a TXT unique to the user, so nobody can claim a
 * domain another user already pointed at you. In sandbox mode a fixed, non-secret key is used when none is set.
 */
export function recordsFor(userId: string, mode: Mode, env: Env): DnsRecord[] {
  const ownershipKey = env.CNAMIO_OWNERSHIP_KEY || (mode === 'sandbox' ? 'sandbox-only-not-a-secret' : '');
  if (!ownershipKey) throw new Error('Set CNAMIO_OWNERSHIP_KEY (any long random string of yours) in the server environment.');
  return recordsForUser({ target: env.CUSTOM_DOMAIN_TARGET || 'customers.example-saas.com', userId, ownershipKey, prefix: 'example-saas-verify' });
}

let shared: CnamioClient | null = null;
/** One client per server process, so the session (and the sandbox session) is reused across requests. */
export function cnamioClient(): CnamioClient {
  shared ??= createCnamio();
  return shared;
}
