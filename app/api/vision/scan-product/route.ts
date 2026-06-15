import { NextResponse } from 'next/server';
import { scanProductVision } from '@/lib/agents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json();
  const dataUrl = (body?.image ?? '').toString();
  if (!dataUrl.startsWith('data:image/')) {
    return NextResponse.json({ error: 'image data URL required' }, { status: 400 });
  }
  try {
    const result = await scanProductVision(dataUrl);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'vision failed' }, { status: 500 });
  }
}
