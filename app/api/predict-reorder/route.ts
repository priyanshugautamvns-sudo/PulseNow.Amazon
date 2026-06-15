import { NextResponse } from 'next/server';
import { predictReorders } from '@/lib/agents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ reminders: predictReorders() });
}
export async function POST() {
  return NextResponse.json({ reminders: predictReorders() });
}
