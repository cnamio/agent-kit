// What the routes do, framework-free: start a connection for a user's domain, read its status, handle the webhook.
import { CnamioError, verifyWebhook } from './cnamio-client.mjs';

const DOMAIN = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/** An answer for the HTTP layer: status and JSON body. */
const reply = (status, body) => ({ status, body });

/** Cnamio's errors as answers the page can show (never the raw upstream body). */
function failure(error) {
  if (!(error instanceof CnamioError)) throw error;
  if (error.status === 409) return reply(409, { error: 'records_conflict', conflicts: error.conflicts ?? [], message: 'Existing DNS records are in the way; nothing was changed.' });
  if (error.status === 422) return reply(422, { error: 'provider_token_refused', message: 'The DNS provider refused the token. Add the records by hand instead.' });
  if (error.status === 429 || error.status === 503) return reply(503, { error: 'try_again', message: 'Cnamio is busy; try again in a few seconds.' });
  if (error.status === 400) return reply(400, { error: 'invalid_request', message: error.message });
  return reply(502, { error: 'cnamio_unavailable', message: `Cnamio answered ${error.status}.` });
}

/**
 * Checks where the domain's DNS is, then connects it: with the user's provider API token when they gave one and the
 * provider supports it, otherwise by returning the exact records to create (Cnamio watches propagation either way).
 * @param {ReturnType<typeof import('./cnamio-client.mjs').createCnamio>} client
 * @param {{ userId: string, domain: unknown, providerToken?: unknown }} input
 */
export async function connectDomain({ cnamio, mode, recordsFor }, { userId, domain, providerToken }) {
  const name = typeof domain === 'string' ? domain.trim().toLowerCase().replace(/\.$/, '') : '';
  if (!DOMAIN.test(name)) return reply(400, { error: 'invalid_domain', message: 'Type a domain such as shop.example.com.' });
  let records;
  try { records = recordsFor(userId); } catch (error) { return reply(500, { error: 'not_configured', message: error.message }); }
  // Jobs and webhooks carry your user id. A sandbox session has a user id of its own and refuses another one.
  const owner = mode === 'sandbox' ? {} : { userId };
  try {
    const check = await cnamio.checkDomain(name, records);
    const token = typeof providerToken === 'string' && providerToken.trim() ? providerToken.trim() : null;
    if (token && check.connectMethods.includes('api_token')) {
      // Used for this call only: never store or log a provider token.
      const job = await cnamio.connectAutomatic(name, records, token, owner);
      return reply(201, { mode, domain: name, provider: check.provider, setup: 'automatic', jobId: job.job_id, status: job.status, records: check.records });
    }
    const job = await cnamio.connect(name, records, owner);
    return reply(201, { mode, domain: name, provider: check.provider, setup: 'manual', automaticAvailable: check.connectMethods.includes('api_token'),
      jobId: job.job_id, status: job.status, records: job.records, conflicts: check.recordConflicts ?? [] });
  } catch (error) { return failure(error); }
}

/** @param {{ cnamio: import('./cnamio-sdk/cnamio.mjs').Cnamio }} client @param {unknown} jobId */
export async function connectionStatus({ cnamio }, jobId) {
  if (typeof jobId !== 'string' || !/^job_[0-9a-f-]{36}$/.test(jobId)) return reply(400, { error: 'invalid_job' });
  try {
    const s = await cnamio.status(jobId);
    return reply(200, { jobId: s.job_id, domain: s.domain, status: s.status, connected: s.connected, health: s.health });
  } catch (error) { return failure(error); }
}

/**
 * The webhook is the source of truth: `domain.added` means every record is live. Verify the signature over the raw
 * body first. Handle each event once (by `event.id`); answer 2xx only after storing the result.
 * @param {string} rawBody @param {Record<string, string | string[] | undefined>} headers @param {(event: any) => void | Promise<void>} onEvent
 */
export async function handleWebhook(rawBody, headers, onEvent, secret = process.env.CNAMIO_WEBHOOK_SECRET) {
  if (!secret) return reply(503, { error: 'webhook_secret_missing' }); // Cnamio retries later
  if (!verifyWebhook(rawBody, headers, secret)) return reply(401, { error: 'bad_signature' });
  await onEvent(JSON.parse(rawBody));
  return reply(200, { received: true });
}
