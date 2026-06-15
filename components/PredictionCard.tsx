'use client';

import { useRouter } from 'next/navigation';
import { Clock, Sparkles, Plus } from 'lucide-react';
import type { Reminder } from '@/lib/types';
import { getProductById } from '@/lib/dataAccess';
import { useCart } from '@/lib/cart';
import { inr } from '@/lib/format';

export function PredictionCard({ reminder }: { reminder: Reminder }) {
  const router = useRouter();
  const cart = useCart();
  const product = getProductById(reminder.product_id);
  if (!product) return null;

  const onReorder = () => {
    cart.add(product, 1);
    router.push(`/checkout?label=${encodeURIComponent('Reorder ' + product.brand)}`);
  };

  return (
    <div className="card p-3.5 flex items-center gap-3">
      <div className="text-2xl w-12 h-12 rounded-xl bg-muted border border-line flex items-center justify-center shrink-0">
        {product.image}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-brand-orange font-semibold flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Likely runs out {reminder.days_until <= 0 ? 'today' : `in ${reminder.days_until}d`}
        </div>
        <div className="font-semibold text-[14px] leading-tight truncate">{product.name}</div>
        <div className="text-[11px] text-ink-500 mt-0.5 flex items-center gap-2">
          <Clock className="w-3 h-3" /> {product.delivery_eta_minutes} min · {inr(product.price)} · {Math.round(reminder.confidence * 100)}% confidence
        </div>
      </div>
      <button
        onClick={onReorder}
        className="shrink-0 w-9 h-9 rounded-xl bg-brand-orange hover:bg-brand-gold text-ink-900 flex items-center justify-center transition"
        aria-label="Reorder"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
