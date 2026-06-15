import { NextResponse } from 'next/server';
import { understandIntentAsync } from '@/lib/agents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json();
  const text = (body?.text ?? body?.transcript ?? '').toString();
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });
  const intent = await understandIntentAsync(text);
  return NextResponse.json({ intent });
}
