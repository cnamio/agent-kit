import { cnamioClient } from '../../../../lib/cnamio-client.ts';
import { connectionStatus } from '../../../../lib/domains.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const { status, body } = await connectionStatus(cnamioClient(), jobId);
  return Response.json(body, { status });
}
