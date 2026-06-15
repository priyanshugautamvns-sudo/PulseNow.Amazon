'use client';

import { motion } from 'framer-motion';
import { Clock, Info, Shuffle, Zap, ShoppingBag, Repeat, Target, ChevronRight } from 'lucide-react';
import type { SmartCard } from '@/lib/types';
import { inr } from '@/lib/format';

const ICONS: Record<SmartCard['type'], any> = {
  fastest: Zap,
  best_match: Target,
  trusted_repeat: Repeat,
  smart_combo: ShoppingBag
};

const STRIP_BG: Record<SmartCard['type'], string> = {
  fastest: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  best_match: 'bg-orange-50 text-[#9C5400] border-orange-200',
  trusted_repeat: 'bg-violet-50 text-violet-800 border-violet-200',
  smart_combo: 'bg-blue-50 text-blue-800 border-blue-200'
};

export function SmartRecommendationCard({
  card,
  onConfirm,
  onExplain,
  onSwap,
  index
}: {
  card: SmartCard;
  onConfirm: (card: SmartCard) => void;
  onExplain: (card: SmartCard) => void;
  onSwap?: (card: SmartCard) => void;
  index: number;
}) {
  const Icon = ICONS[card.type];
  const savings = card.mrp_total - card.price_total;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className="card overflow-hidden"
    >
      <div className={`flex items-center gap-2 px-4 py-2 text-[12px] font-semibold border-b ${STRIP_BG[card.type]}`}>
        <Icon className="w-4 h-4" />
        {card.title}
        <span className="ml-auto text-[10px] uppercase tracking-wider text-ink-500 font-medium">
          {card.badge}
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="text-3xl shrink-0 w-14 h-14 rounded-xl bg-muted border border-line flex items-center justify-center">
            {card.items[0]?.product.image ?? '🛍️'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold leading-tight">
              {card.items.length === 1 ? card.items[0].product.name : `${card.items.length} items · ${card.title.toLowerCase()}`}
            </div>
            <div className="text-[12px] text-ink-500 mt-0.5">{card.subtitle}</div>
            {card.items.length > 1 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {card.items.slice(0, 6).map((it) => (
                  <span key={it.product.id} className="pill-soft">
                    <span>{it.product.image}</span>
                    <span className="truncate max-w-[100px]">{it.product.name.split(' ').slice(0, 2).join(' ')}</span>
                  </span>
                ))}
                {card.items.length > 6 && <span className="pill-soft">+{card.items.length - 6}</span>}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <Stat label="Price" value={inr(card.price_total)} sub={savings > 0 ? `save ${inr(savings)}` : undefined} />
          <Stat label="ETA" value={`${card.eta_minutes} min`} sub="to your address" icon={<Clock className="w-3 h-3" />} />
          <Stat label="Confidence" value={`${Math.round(card.ranking.final_score * 100)}%`} sub="Pulse score" />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {card.trust_indicators.slice(0, 4).map((t) => (
            <span key={t} className="pill-orange">{t}</span>
          ))}
        </div>

        <div className="mt-3 text-[12px] text-ink-700 leading-relaxed flex items-start gap-1.5">
          <span className="text-brand-orange">✦</span>
          <span>{card.reason}</span>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2">
          <button onClick={() => onConfirm(card)} className="btn-primary">
            Add & confirm <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => onExplain(card)} className="btn-ghost px-3" aria-label="Why this?">
            <Info className="w-4 h-4" />
          </button>
          {onSwap && (
            <button onClick={() => onSwap(card)} className="btn-ghost px-3" aria-label="Swap">
              <Shuffle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function Stat({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="surface-soft px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">{label}</div>
      <div className="font-semibold flex items-center gap-1 mt-0.5">{icon}{value}</div>
      {sub && <div className="text-[10px] text-ink-500 mt-0.5">{sub}</div>}
    </div>
  );
}
