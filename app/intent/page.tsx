'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Languages, AlertTriangle, Bot, Wand2 } from 'lucide-react';
import type { IntentResult, SmartCard } from '@/lib/types';
import type { SmartCartResult } from '@/lib/agents';
import { SmartRecommendationCard } from '@/components/SmartRecommendationCard';
import { ExplanationModal } from '@/components/ExplanationModal';
import { RankingBreakdownPanel } from '@/components/RankingBreakdown';
import { useCart } from '@/lib/cart';

function IntentInner() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get('q') ?? '';
  const cart = useCart();

  const [intent, setIntent] = useState<IntentResult | null>(null);
  const [cards, setCards] = useState<SmartCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCard, setOpenCard] = useState<SmartCard | null>(null);
  const [showRanking, setShowRanking] = useState(false);

  // Optional: AI smart-cart suggestion shown alongside the SmartCards.
  const [aiCart, setAiCart] = useState<SmartCartResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: q })
    })
      .then((r) => r.json())
      .then((j) => {
        setIntent(j.intent);
        setCards(j.cards ?? []);
      })
      .finally(() => setLoading(false));

    // Concurrently ask Bedrock for an AI cart for the same query.
    setAiLoading(true);
    fetch('/api/smart-cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q })
    })
      .then((r) => r.json())
      .then(setAiCart)
      .finally(() => setAiLoading(false));
  }, [q]);

  const onConfirm = (card: SmartCard) => {
    cart.addMany(card.items.map((i) => ({ product: i.product, qty: i.qty })), true);
    router.push(`/checkout?label=${encodeURIComponent(card.title)}`);
  };

  const onAddAI = () => {
    if (!aiCart) return;
    cart.addMany(aiCart.picks.map((p) => ({ product: p.product, qty: p.qty, note: p.note })), true);
    router.push('/checkout?label=AI+pick');
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="w-9 h-9 rounded-full bg-surface border border-line flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-brand-orange font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Need understood
          </div>
          <div className="font-semibold leading-tight truncate">{q}</div>
        </div>
        <Link href={`/chat?q=${encodeURIComponent(q)}`} className="btn-ghost py-1.5 text-[12px]">
          <Bot className="w-4 h-4" /> Chat
        </Link>
      </div>

      {intent && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4"
        >
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-ink-500 font-semibold">
            <Languages className="w-3.5 h-3.5 text-brand-orange" /> Pulse heard you
          </div>
          <div className="font-semibold mt-1">{intent.hinglish_response}</div>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
            <Tag k="Intent" v={intent.intent_type} />
            <Tag k="Goal" v={intent.goal} />
            <Tag k="Urgency" v={`${Math.round(intent.urgency_score * 100)}%`} />
            <Tag k="Category" v={intent.category} />
            {intent.dietary[0] && <Tag k="Diet" v={intent.dietary.join(', ')} />}
            <Tag k="Cart type" v={intent.cart_type} />
          </div>
          {intent.constraints?.includes('requires_caution') && (
            <div className="mt-3 flex items-start gap-2 p-2 rounded-lg bg-red-50 border border-red-200 text-bad text-[12px]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Wellness intent. Information products only — consult a doctor for medical advice.</span>
            </div>
          )}
        </motion.div>
      )}

      {/* AI Smart Cart card */}
      {(aiLoading || aiCart) && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="card p-4 border-l-4 border-l-brand-orange">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-brand-orange font-semibold">
            <Wand2 className="w-3.5 h-3.5" /> Pulse AI cart {aiCart?.source === 'bedrock' && <span className="pill-good ml-2 text-[10px]">live</span>}
          </div>
          {aiLoading && <div className="h-16 bg-muted rounded-lg animate-pulse mt-2" />}
          {aiCart && (
            <>
              <div className="text-[14px] mt-1">{aiCart.message}</div>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                {aiCart.picks.map((p) => (
                  <div key={p.product.id} className="surface-soft p-2 flex items-center gap-2">
                    <div className="text-xl">{p.product.image}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-medium truncate">{p.product.name}</div>
                      <div className="text-[10px] text-ink-500">qty {p.qty}</div>
                    </div>
                  </div>
                ))}
              </div>
              {aiCart.picks.length > 0 && (
                <button onClick={onAddAI} className="btn-primary w-full mt-3 py-2.5 text-[13px]">
                  Use Pulse AI cart →
                </button>
              )}
            </>
          )}
        </motion.div>
      )}

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="card h-44 animate-pulse" />)}
        </div>
      )}

      <div className="space-y-3">
        {cards.map((c, i) => (
          <SmartRecommendationCard
            key={c.id}
            card={c}
            index={i}
            onConfirm={onConfirm}
            onExplain={(card) => setOpenCard(card)}
            onSwap={() => setShowRanking((s) => !s)}
          />
        ))}
      </div>

      {showRanking && cards[0] && (
        <div className="space-y-2">
          <div className="text-[12px] text-ink-500 px-1">Why this ranking? Transparent score for the top card.</div>
          <RankingBreakdownPanel breakdown={cards[0].ranking} />
        </div>
      )}

      <ExplanationModal card={openCard} open={!!openCard} onClose={() => setOpenCard(null)} />
    </div>
  );
}

function Tag({ k, v }: { k: string; v: string }) {
  return (
    <div className="surface-soft px-2.5 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-ink-500 font-semibold">{k}</div>
      <div className="font-medium truncate">{v}</div>
    </div>
  );
}

export default function IntentPage() {
  return (
    <Suspense fallback={<div className="pt-10 text-ink-500">Loading…</div>}>
      <IntentInner />
    </Suspense>
  );
}
