'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Sparkles, Home } from 'lucide-react';
import { UndoToast } from '@/components/UndoToast';
import productsRaw from '@/data/products.json';
import { inr } from '@/lib/format';
import type { Product } from '@/lib/types';
import { useOrders } from '@/lib/orders';

const PRODUCTS = productsRaw as Product[];

function OrderSuccessInner() {
  const router = useRouter();
  const params = useSearchParams();
  const orders = useOrders();
  const orderId = params.get('order') ?? 'PULSE-12345';
  const eta = Number(params.get('eta') ?? 12);
  const total = Number(params.get('total') ?? 0);
  const label = params.get('label') ?? 'Pulse order';

  const items = useMemo(() => {
    const ids = (params.get('items') ?? '').split(',').filter(Boolean);
    const counts: Record<string, number> = {};
    for (const id of ids) counts[id] = (counts[id] ?? 0) + 1;
    return Object.entries(counts)
      .map(([id, qty]) => {
        const product = PRODUCTS.find((p) => p.id === id);
        return product ? { product, qty } : null;
      })
      .filter(Boolean) as { product: Product; qty: number }[];
  }, [params]);

  const [resolved, setResolved] = useState(false);

  const handleUndo = () => {
    setResolved(true);
    orders.cancel(orderId);
    router.replace('/?undone=1');
  };

  const handleConfirmNow = () => {
    setResolved(true);
    // Order is already saved; nothing else to do here.
  };

  const handleExpire = () => setResolved(true);

  return (
    <div className="space-y-4 pt-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card p-6 text-center"
      >
        <div className="w-14 h-14 mx-auto rounded-full bg-good/15 text-good border border-good/30 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <div className="mt-3 text-[11px] uppercase tracking-wider text-good font-semibold">Order placed</div>
        <div className="text-2xl font-semibold mt-1">Arrives in {eta} min</div>
        <div className="text-ink-300 text-[14px] mt-1">{label} · {inr(total)}</div>
        <div className="mt-3 text-[11px] text-ink-400">Order ID {orderId}</div>
        <div className="mt-2 text-[11px] text-ink-400">
          {total > 500
            ? 'High-value safety window: 10s undo, or hit Confirm now.'
            : 'Quick undo window: 5s.'}
        </div>
      </motion.div>

      {items.length > 0 && (
        <div className="card p-4">
          <div className="h-eyebrow mb-2">In your bag</div>
          <div className="grid grid-cols-2 gap-2">
            {items.map((it) => (
              <div key={it.product.id} className="surface-soft p-2.5 flex items-center gap-2">
                <div className="text-2xl">{it.product.image}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-medium truncate">{it.product.name}</div>
                  <div className="text-[10px] text-ink-300">qty {it.qty}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-4">
        <div className="h-eyebrow mb-2 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-brand-amber" /> Live tracking</div>
        <div className="space-y-2 text-[14px]">
          <Step active label="Picked at Whitefield dark store" t="now" />
          <Step active label="Packed by Pulse robot" t={`+${Math.max(2, Math.round(eta * 0.2))}m`} />
          <Step label="Out for delivery" t={`+${Math.round(eta * 0.5)}m`} />
          <Step label="At your door" t={`+${eta}m`} />
        </div>
      </div>

      <Link href="/" className="btn-ghost w-full">
        <Home className="w-4 h-4" /> Back home
      </Link>

      {!resolved && (
        <UndoToast
          total={total}
          onUndo={handleUndo}
          onConfirmNow={handleConfirmNow}
          onExpire={handleExpire}
        />
      )}
    </div>
  );
}

function Step({ active, label, t }: { active?: boolean; label: string; t: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-brand-amber' : 'bg-line'}`} />
      <div className={`flex-1 ${active ? 'text-ink-100' : 'text-ink-300'}`}>{label}</div>
      <div className={`text-[12px] ${active ? 'text-brand-amber' : 'text-ink-400'} flex items-center gap-1`}>
        <Clock className="w-3 h-3" /> {t}
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="pt-10 text-ink-300">Loading…</div>}>
      <OrderSuccessInner />
    </Suspense>
  );
}
