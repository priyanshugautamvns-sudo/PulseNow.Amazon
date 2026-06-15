import { NextResponse } from 'next/server';
import { chatRespond, aiAvailability } from '@/lib/agents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(aiAvailability());
}

export async function POST(req: Request) {
  const body = await req.json();
  const history = Array.isArray(body?.history) ? body.history : [];
  const message = (body?.message ?? '').toString();
  const preferences = body?.preferences && typeof body.preferences === 'object' ? body.preferences : undefined;
  if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });
  const reply = await chatRespond(history, message, preferences);
  return NextResponse.json({ ...reply, ...aiAvailability() });
}
