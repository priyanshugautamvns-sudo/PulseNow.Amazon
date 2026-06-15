import { NextResponse } from 'next/server';
import { scanList } from '@/lib/agents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json();
  const key = (body?.image_key ?? body?.key ?? 'sample_list_priya').toString();
  const result = scanList(key);
  if (!result) return NextResponse.json({ error: 'sample not found' }, { status: 404 });
  return NextResponse.json(result);
}
