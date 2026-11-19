import { cnamioClient } from '../../../lib/cnamio-client.ts';
import { connectDomain } from '../../../lib/domains.ts';

export const runtime = 'nodejs'; // the SDK uses node:crypto
export const dynamic = 'force-dynamic';

// Replace with your own auth: every connection belongs to the signed-in user (echoed in jobs and webhooks).
async function currentUser() { return { id: 'demo-user' }; }

export async function POST(request: Request) {
  const user = await currentUser();
  const body = await request.json().catch(() => ({})) as { domain?: unknown; providerToken?: unknown };
  const { status, body: answer } = await connectDomain(cnamioClient(), { userId: user.id, domain: body.domain, providerToken: body.providerToken });
  return Response.json(answer, { status });
}
