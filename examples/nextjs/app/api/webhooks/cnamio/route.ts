import { handleWebhook } from '../../../../lib/domains.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Register https://<your app>/api/webhooks/cnamio in the Cnamio dashboard (or PUT /v1/manage/webhook) and put the
// webhook secret in CNAMIO_WEBHOOK_SECRET. The sandbox sends no webhooks.
export async function POST(request: Request) {
  const raw = await request.text(); // the raw body: the signature covers it byte for byte
  const { status, body } = await handleWebhook(raw, request.headers, async event => {
    // Idempotent by event.id. domain.added: mark event.domain connected for event.user_id; store it, then answer 200.
    console.log('cnamio webhook', event.type, event.domain);
  });
  return Response.json(body, { status });
}
