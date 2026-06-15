'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ThumbsUp, ThumbsDown, BookOpen, Repeat2, Sparkles } from 'lucide-react';
import type { ExplainResult, SmartCard } from '@/lib/types';

export function ExplanationModal({
  card,
  open,
  onClose
}: {
  card: SmartCard | null;
  open: boolean;
  onClose: () => void;
}) {
  const [data, setData] = useState<ExplainResult | null>(null);
  const productId = card?.items?.[0]?.product?.id;

  useEffect(() => {
    if (!open || !productId) return;
    setData(null);
    fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId })
    })
      .then((r) => r.json())
      .then((j) => setData(j.explanation));
  }, [open, productId]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-ink-900/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26 }}
            className="fixed bottom-0 inset-x-0 z-50 max-w-md md:max-w-lg mx-auto"
          >
            <div className="bg-surface rounded-t-3xl border-t border-x border-line p-5 max-h-[82vh] overflow-y-auto shadow-e3">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-brand-orange font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Why this pick
                  </div>
                  <div className="text-lg font-semibold mt-0.5">{card?.items?.[0]?.product?.name}</div>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!data && <div className="h-32 animate-pulse bg-muted rounded-xl" />}

              {data && (
                <div className="space-y-3">
                  <Section title="Reasons" icon={<Sparkles className="w-4 h-4 text-brand-orange" />}>
                    <ul className="space-y-1.5 text-[14px] text-ink-900">
                      {data.why.map((w) => (
                        <li key={w} className="flex gap-2">
                          <span className="text-brand-orange">•</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </Section>

                  <div className="grid grid-cols-2 gap-3">
                    <Section title="Pros" icon={<ThumbsUp className="w-4 h-4 text-good" />}>
                      <ul className="space-y-1 text-[12px] text-ink-700">
                        {data.pros.length ? data.pros.map((p) => <li key={p}>+ {p}</li>) : <li className="text-ink-400">—</li>}
                      </ul>
                    </Section>
                    <Section title="Cons" icon={<ThumbsDown className="w-4 h-4 text-bad" />}>
                      <ul className="space-y-1 text-[12px] text-ink-700">
                        {data.cons.length ? data.cons.map((p) => <li key={p}>− {p}</li>) : <li className="text-ink-400">None worth flagging</li>}
                      </ul>
                    </Section>
                  </div>

                  <Section title="How to use" icon={<BookOpen className="w-4 h-4 text-brand-blue" />}>
                    <p className="text-[14px] text-ink-700">{data.usage}</p>
                  </Section>

                  <Section title="Preference match" icon={<Sparkles className="w-4 h-4 text-violet-600" />}>
                    <p className="text-[14px] text-ink-700">{data.preference_match}</p>
                  </Section>

                  {data.alternatives.length > 0 && (
                    <Section title="Alternatives" icon={<Repeat2 className="w-4 h-4 text-brand-orange" />}>
                      <ul className="space-y-1.5 text-[14px] text-ink-900">
                        {data.alternatives.map((a) => (
                          <li key={a.id} className="flex items-start gap-2">
                            <span className="text-brand-orange">↻</span>
                            <div>
                              <div className="font-medium">{a.name}</div>
                              <div className="text-[12px] text-ink-500">{a.reason}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </Section>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="surface-soft p-3.5">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-2">
        {icon} {title}
      </div>
      {children}
    </div>
  );
}
