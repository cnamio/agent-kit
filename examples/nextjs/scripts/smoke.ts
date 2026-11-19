// End to end against the real Cnamio API: the sandbox without credentials, your application with them.
// In the sandbox any domain connects at once, conflict.<domain> has a record in the way, and nothing real is touched.
import { createCnamio } from '../lib/cnamio-client.ts';
import { connectDomain, connectionStatus } from '../lib/domains.ts';

const client = createCnamio();
const domain = process.argv[2] ?? (client.mode === 'sandbox' ? `shop-${Date.now().toString(36)}.example.com` : null);
if (!domain) {
  console.error('With credentials, pass a test domain you own: npm run smoke -- links.yourdomain.com');
  process.exit(2);
}
console.log(`Cnamio mode: ${client.mode}; domain: ${domain}`);
const started = await connectDomain(client, { userId: 'smoke-user', domain });
console.log('connect ->', started.status, started.body.setup ?? started.body.error, started.body.provider ?? '');
if (started.status !== 201) process.exit(1);
for (const r of started.body.records as { type: string; host: string; value: string }[]) console.log(`  ${r.type.padEnd(5)} ${r.host}  ${r.value}`);
const status = await connectionStatus(client, started.body.jobId);
console.log('status ->', status.status, status.body.status);
if (status.status !== 200) process.exit(1);
console.log('OK');
