import { NextResponse } from 'next/server';
import { buildSmartCart } from '@/lib/agents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json();
  const query = (body?.query ?? body?.message ?? '').toString();
  const preferences = body?.preferences && typeof body.preferences === 'object' ? body.preferences : undefined;
  if (!query) return NextResponse.json({ error: 'query required' }, { status: 400 });
  const result = await buildSmartCart(query, preferences);
  return NextResponse.json(result);
}
