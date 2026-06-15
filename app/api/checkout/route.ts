import { NextResponse } from 'next/server';
import { userProfile } from '@/lib/dataAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json();
  const items = (body?.items ?? []) as { product: any; qty: number }[];
  const total = items.reduce((s, it) => s + it.product.price * it.qty, 0);
  const eta = items.reduce((m, it) => Math.max(m, it.product.delivery_eta_minutes ?? 0), 0);
  const payment = body?.payment_method ?? userProfile.payment.default_method;
  const address = body?.address ?? `${userProfile.address.label}: ${userProfile.address.line}, ${userProfile.address.pincode}`;
  const order_id = `o_${Date.now().toString(36).toUpperCase()}`;
  return NextResponse.json({
    order_id,
    eta_minutes: eta || 12,
    total,
    undo_window_seconds: 5,
    payment_method: payment,
    address,
    placed_at: new Date().toISOString()
  });
}
