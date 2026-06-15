import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  return NextResponse.json({ ok: true, id: params.id, patched: body });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  return NextResponse.json({ ok: true, id: params.id, deleted: true });
}
