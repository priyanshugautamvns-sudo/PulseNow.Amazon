import { NextResponse } from 'next/server';
import { buildEmergencyTiers } from '@/lib/agents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json();
  const scenarioId = (body?.scenario_id ?? '').toString();
  const count = Number(body?.count ?? 4);
  const tiers = buildEmergencyTiers(scenarioId, count);
  if (!tiers) return NextResponse.json({ error: 'scenario not found' }, { status: 404 });
  return NextResponse.json({ tiers });
}
