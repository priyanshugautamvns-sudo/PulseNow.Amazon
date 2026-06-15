import { NextResponse } from 'next/server';
import { explain, understandIntent } from '@/lib/agents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json();
  const intent = body?.intent ?? understandIntent(body?.text ?? '');
  const result = explain(body?.product_id, intent);
  if (!result) return NextResponse.json({ error: 'product not found' }, { status: 404 });
  return NextResponse.json({ explanation: result });
}
