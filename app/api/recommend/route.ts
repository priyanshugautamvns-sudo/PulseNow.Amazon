import { NextResponse } from 'next/server';
import { buildSmartCards, understandIntentAsync } from '@/lib/agents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json();
  const intent = body?.intent ?? (await understandIntentAsync(body?.text ?? ''));
  const cards = buildSmartCards(intent);
  return NextResponse.json({ intent, cards });
}
