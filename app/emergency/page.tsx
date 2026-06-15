'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Siren, Sparkles, Clock, ShieldCheck, Plus, Wand2 } from 'lucide-react';
import demoScenariosRaw from '@/data/demoScenarios.json';
import { OneConfirmButton } from '@/components/OneConfirmButton';
import { inr } from '@/lib/format';
import type { Product } from '@/lib/types';
import { useCart } from '@/lib/cart';

const SCENARIOS = (demoScenariosRaw as any[]).filter((s) => s.intent_type === 'emergency');

type Tier = 'fastest' | 'premium' | 'budget';
type TierCart = { items: { product: Product; qty: number }[]; price: number; mrp: number; eta: number };

function EmergencyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const cart = useCart();

  const initial = params.get('id') ?? '';
  const [scenarioId, setScenarioId] = useState(initial || SCENARIOS[0].id);
  const [tier, setTier] = useState<Tier>('fastest');
  const [count, setCount] = useState(4);
  const [tiers, setTiers] = useState<Record<Tier, TierCart> | null>(null);
  const [loading, setLoading] = useState(true);

  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];
  const isPerGuest = scenario.scaling === 'per_guest';

  useEffect(() => {
    setLoading(true);
    fetch('/api/emergency-tiers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario_id: scenarioId, count: isPerGuest ? count : 1 })
    })
      .then((r) => r.json())
      .then((j) => setTiers(j.tiers))
      .finally(() => setLoading(false));
  }, [scenarioId, count, isPerGuest]);

  const cartPreview = tiers?.[tier];

  const onAddToCart = () => {
    if (!cartPreview) return;
    cart.addMany(cartPreview.items.map((it) => ({ product: it.product, qty: it.qty })), true);
    router.push(`/checkout?label=${encodeURIComponent('Emergency: ' + scenario.label)}`);
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="w-9 h-9 rounded-full bg-surface border border-line flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-bad flex items-center gap-1">
            <Siren className="w-3 h-3" /> Emergency mode
          </div>
          <h1 className="text-lg font-semibold leading-tight">Get sorted in seconds</h1>
        </div>
      </div>

      {/* Scenario picker */}
      <div className="card p-3">
        <div className="h-eyebrow mb-2">Pick situation</div>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          {SCENARIOS.map((s) => {
            const active = s.id === scenarioId;
            return (
              <motion.button
                key={s.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setScenarioId(s.id)}
                className={`p-3 rounded-xl border text-center transition ${
                  active
                    ? 'bg-orange-50 border-orange-300 text-[#9C5400]'
                    : 'bg-surface border-line hover:bg-muted text-ink-700'
                }`}
              >
                <div className="text-2xl">{s.icon}</div>
                <div className="text-[11px] mt-1 font-medium leading-tight">{s.label}</div>
              </motion.button>
            );
          })}
          <Link
            href="/emergency/custom"
            className="p-3 rounded-xl border border-dashed border-line bg-surface hover:bg-muted text-center text-ink-500"
          >
            <Plus className="w-5 h-5 mx-auto" />
            <div className="text-[11px] mt-1 font-medium">Custom</div>
          </Link>
        </div>
      </div>

      {/* Per-guest scaler */}
      {isPerGuest && (
        <div className="card p-4">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-2">
            <Sparkles className="w-3 h-3 text-brand-orange" /> One quick question
          </div>
          <div className="font-semibold mb-2">How many guests?</div>
          <div className="grid grid-cols-5 gap-2">
            {[2, 4, 6, 8, 12].map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`py-2 rounded-xl border text-sm transition ${
                  count === n
                    ? 'bg-brand-navy text-white border-brand-navy font-semibold'
                    : 'bg-surface border-line hover:bg-muted'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-ink-500 mt-2">
            Quantities scale automatically with guest count.
          </div>
        </div>
      )}

      {/* Tier toggle */}
      <div className="card p-1.5 grid grid-cols-3 gap-1">
        {(['budget', 'fastest', 'premium'] as Tier[]).map((t) => (
          <button
            key={t}
            onClick={() => setTier(t)}
            className={`py-2 rounded-lg text-[13px] capitalize transition ${
              tier === t ? 'bg-brand-navy text-white font-semibold' : 'text-ink-700 hover:bg-muted'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Cart preview */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tier + scenarioId + count}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="card p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-brand-orange font-semibold">
                {tier} tier · auto-built
              </div>
              <div className="font-semibold leading-tight mt-0.5">
                {scenario.label}{isPerGuest ? ` · ${count} guests` : ''}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-ink-500 flex items-center gap-1 justify-end">
                <Clock className="w-3 h-3" /> {cartPreview?.eta ?? 0} min
              </div>
              <div className="font-bold text-lg">{inr(cartPreview?.price ?? 0)}</div>
              {cartPreview && cartPreview.mrp > cartPreview.price && (
                <div className="text-[11px] text-good">save {inr(cartPreview.mrp - cartPreview.price)}</div>
              )}
            </div>
          </div>

          {loading && <div className="h-32 bg-muted rounded-xl animate-pulse" />}
          {cartPreview && (
            <div className="space-y-2">
              {cartPreview.items.map((it) => (
                <div key={it.product.id} className="surface-soft p-2.5 flex items-center gap-3">
                  <div className="text-2xl shrink-0">{it.product.image}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium truncate">{it.product.name}</div>
                    <div className="text-[11px] text-ink-500">{it.product.brand}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[11px] text-ink-500">qty {it.qty}</div>
                    <div className="text-[13px] font-semibold">{inr(it.product.price * it.qty)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {scenario.requires_caution && (
            <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-bad text-[12px]">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>This kit includes wellness items. Information only. Consult a doctor if symptoms persist or are severe.</span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <button
        onClick={onAddToCart}
        disabled={!cartPreview || cartPreview.items.length === 0}
        className="btn-primary w-full"
      >
        Edit & checkout · {inr(cartPreview?.price ?? 0)}
      </button>

      <Link href="/emergency/custom" className="card p-4 flex items-center gap-3 hover:bg-muted transition">
        <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#9C5400] flex items-center justify-center">
          <Wand2 className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[14px]">Don't see your situation?</div>
          <div className="text-[12px] text-ink-500">Describe it and Pulse AI builds a custom kit.</div>
        </div>
        <span className="text-brand-blue text-[13px]">Open →</span>
      </Link>
    </div>
  );
}

export default function EmergencyPage() {
  return (
    <Suspense fallback={<div className="pt-10 text-ink-500">Loading…</div>}>
      <EmergencyInner />
    </Suspense>
  );
}
