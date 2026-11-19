import { cnamioClient } from '../../../lib/cnamio-client.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ mode: cnamioClient().mode });
}
