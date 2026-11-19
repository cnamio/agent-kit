// "Add custom domains to my SaaS" with Express and Cnamio. `npm run dev` works without an account (sandbox);
// set CNAMIO_APPLICATION_ID and CNAMIO_SECRET to use your own application. See README.md.
import express from 'express';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { createCnamio } from './lib/cnamio-client.mjs';
import { connectDomain, connectionStatus, handleWebhook } from './lib/domains.mjs';

/** @param {{ client?: ReturnType<typeof createCnamio>, onEvent?: (event: any) => void | Promise<void>, webhookSecret?: string }} [options] */
export function createApp({ client = createCnamio(), onEvent = event => console.log('cnamio webhook', event.type, event.domain), webhookSecret } = {}) {
  const app = express();
  const send = (res, { status, body }) => res.status(status).json(body);

  // The webhook needs the raw body for the signature: register it BEFORE express.json().
  app.post('/webhooks/cnamio', express.raw({ type: 'application/json' }), async (req, res) => {
    send(res, await handleWebhook(Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '', req.headers, onEvent, webhookSecret ?? process.env.CNAMIO_WEBHOOK_SECRET));
  });
  app.use(express.json());
  app.use(express.static(join(import.meta.dirname, 'public')));

  // Replace with your own auth: every connection belongs to the signed-in user (echoed in jobs and webhooks).
  const currentUser = () => ({ id: 'demo-user' });

  app.get('/api/mode', (_req, res) => res.json({ mode: client.mode }));
  app.post('/api/domains', async (req, res) => {
    send(res, await connectDomain(client, { userId: currentUser().id, domain: req.body?.domain, providerToken: req.body?.providerToken }));
  });
  app.get('/api/domains/:jobId', async (req, res) => send(res, await connectionStatus(client, req.params.jobId)));
  return app;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const client = createCnamio();
  const port = Number(process.env.PORT) || 3000;
  createApp({ client }).listen(port, () => {
    console.log(`http://localhost:${port}  (Cnamio: ${client.mode === 'sandbox' ? 'sandbox, no account needed' : 'your application'})`);
  });
}
