'use client';

import type { RankingBreakdown as RB } from '@/lib/types';

const LABELS: Record<keyof Omit<RB, 'final_score' | 'weights'>, string> = {
  intent_match_score: 'Intent match',
  urgency_eta_score: 'Urgency / ETA',
  preference_match_score: 'Personalisation',
  trust_score: 'Trust',
  availability_score: 'Inventory',
  price_value_score: 'Price value',
  business_margin_score: 'Margin'
};

export function RankingBreakdownPanel({ breakdown }: { breakdown: RB }) {
  const rows = (Object.keys(LABELS) as (keyof typeof LABELS)[]).map((k) => ({
    key: k,
    label: LABELS[k],
    raw: breakdown[k] as number,
    weight: breakdown.weights?.[k] ?? 0
  }));

  return (
    <div className="surface-soft p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="h-eyebrow">Ranking breakdown</div>
        <div className="text-[12px]">
          Final: <span className="font-semibold text-brand-orange">{Math.round(breakdown.final_score * 100)}%</span>
        </div>
      </div>
      <div className="space-y-2.5">
        {rows.map((r) => {
          const contribution = r.raw * r.weight;
          return (
            <div key={r.key}>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-ink-700">{r.label}</span>
                <span className="text-ink-500">
                  {Math.round(r.raw * 100)}% × {Math.round(r.weight * 100)}% = <span className="text-ink-900">{(contribution * 100).toFixed(1)}%</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-line overflow-hidden">
                <div
                  className="h-full bg-brand-orange"
                  style={{ width: `${Math.min(100, contribution * 100 * 4)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
