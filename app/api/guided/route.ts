import { NextResponse } from 'next/server';
import { guidedNextStep } from '@/lib/agents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json();
  const goal = (body?.goal ?? '').toString();
  const history = Array.isArray(body?.history) ? body.history : [];
  const preferences = body?.preferences && typeof body.preferences === 'object' ? body.preferences : undefined;
  if (!goal) return NextResponse.json({ error: 'goal required' }, { status: 400 });
  const step = await guidedNextStep(goal, history, preferences);
  return NextResponse.json(step);
}
