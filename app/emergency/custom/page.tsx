'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Wand2, Sparkles, Clock, ChevronRight } from 'lucide-react';
import { UnavailableSection } from '@/components/UnavailableSection';
import { inr } from '@/lib/format';
import type { Product } from '@/lib/types';
import { useCart } from '@/lib/cart';
import { useUserPreferences } from '@/lib/userPreferences';

const PRESETS = [
  'My back hurts after a long flight',
  'Movie night for 6 friends',
  'Surprise birthday in 30 minutes',
  'Long study session, need brain food',
  'Migraine kit for tonight',
  'Period care, premium please'
];

export default function CustomEmergencyPage() {
  const router = useRouter();
  const cart = useCart();
  const { forAI } = useUserPreferences();

  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState<{
    message: string;
    picks: { product: Product; qty: number; note?: string }[];
    outOfStock: { product: Product; substitute?: Product | null }[];
    notInCatalog: { name: string; reason?: string }[];
    warnings: string[];
    source: string;
  } | null>(null);

  const submit = async (q?: string) => {
    const value = (q ?? text).trim();
    if (!value) return;
    setText(value);
    setLoading(true);
    setReply(null);
    try {
      const res = await fetch('/api/smart-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `Emergency situation: ${value}. Build a small, fast cart.`, preferences: forAI() })
      }).then((r) => r.json());
      setReply({
        message: res.message,
        picks: res.picks ?? [],
        outOfStock: res.outOfStock ?? [],
        notInCatalog: res.notInCatalog ?? [],
        warnings: res.warnings ?? [],
        source: res.source
      });
    } finally {
      setLoading(false);
    }
  };

  const total = reply?.picks.reduce((s, p) => s + p.product.price * p.qty, 0) ?? 0;
  const eta = reply?.picks.length ? Math.max(...reply.picks.map((p) => p.product.delivery_eta_minutes)) : 0;

  const onUseCart = () => {
    if (!reply?.picks?.length) return;
    cart.addMany(reply.picks.map((p) => ({ product: p.product, qty: p.qty, note: p.note })), false);
    router.push(`/checkout?label=${encodeURIComponent('Custom: ' + text.slice(0, 30))}`);
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center gap-2">
        <Link href="/emergency" className="w-9 h-9 rounded-full bg-surface border border-line flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-bad flex items-center gap-1">
            <Wand2 className="w-3 h-3" /> Custom emergency
          </div>
          <h1 className="text-lg font-semibold leading-tight">Describe your situation</h1>
        </div>
      </div>

      <div className="card p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. My friend just landed from a 14-hour flight and needs comfort food + recovery basics"
          rows={3}
          className="w-full bg-transparent outline-none p-2 text-[14px] resize-none placeholder:text-ink-400"
        />
        <button onClick={() => submit()} disabled={loading || !text.trim()} className="btn-primary w-full mt-1">
          {loading ? 'Pulse AI is thinking…' : 'Build my kit'}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => submit(p)}
            className="shrink-0 px-3 py-1.5 rounded-full bg-surface border border-line text-[12px] hover:bg-muted"
          >
            {p}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card p-6 text-center">
            <Sparkles className="w-5 h-5 mx-auto text-brand-amber animate-pulse" />
            <div className="text-[13px] text-ink-300 mt-2">Pulse is reading the catalog…</div>
          </motion.div>
        )}
      </AnimatePresence>

      {reply && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="card p-4">
            <div className="text-[11px] uppercase tracking-wider text-brand-amber font-semibold flex items-center gap-1">
              <Wand2 className="w-3 h-3" /> Pulse {reply.source === 'bedrock' ? '· Claude Sonnet' : reply.source === 'recipe' ? '· Recipe' : '· Catalog'}
              {reply.source === 'bedrock' && <span className="pill-good ml-2 text-[10px]">live</span>}
            </div>
            <div className="font-semibold mt-1">{reply.message}</div>
            {reply.warnings.length > 0 && (
              <ul className="mt-2 space-y-0.5">
                {reply.warnings.map((w, i) => (
                  <li key={i} className="text-[11px] text-warn">⚠ {w}</li>
                ))}
              </ul>
            )}
          </div>

          {reply.picks.length > 0 && (
            <>
              <div className="card p-4 space-y-2">
                {reply.picks.map((p) => (
                  <div key={p.product.id} className="surface-soft p-2.5 flex items-center gap-3">
                    <div className="text-2xl shrink-0">{p.product.image}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium truncate">{p.product.name}</div>
                      <div className="text-[11px] text-ink-300">{p.product.brand}{p.note ? ` · ${p.note}` : ''}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[11px] text-ink-300">qty {p.qty}</div>
                      <div className="text-[13px] font-semibold">{inr(p.product.price * p.qty)}</div>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-line text-sm">
                  <span className="text-ink-300 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> ETA {eta} min</span>
                  <span className="font-bold">{inr(total)}</span>
                </div>
              </div>
              <button onClick={onUseCart} className="btn-primary w-full">
                Edit & checkout <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          <UnavailableSection
            outOfStock={reply.outOfStock}
            notInCatalog={reply.notInCatalog}
          />

          {reply.picks.length === 0 && reply.outOfStock.length === 0 && reply.notInCatalog.length === 0 && (
            <div className="card p-4 text-[13px] text-ink-300">
              Pulse couldn't find catalog matches. Try a more specific description.
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
