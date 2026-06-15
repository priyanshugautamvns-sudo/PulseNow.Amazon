import { NextResponse } from 'next/server';
import { scanProduct } from '@/lib/agents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json();
  const key = (body?.image_key ?? body?.key ?? 'maggi_packet').toString();
  const result = scanProduct(key);
  if (!result) return NextResponse.json({ error: 'sample not found' }, { status: 404 });
  return NextResponse.json(result);
}
