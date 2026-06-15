'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles, Clock, MessageSquareDashed, Bot, ChevronRight, Wand2 } from 'lucide-react';
import { UnavailableSection } from '@/components/UnavailableSection';
import { inr } from '@/lib/format';
import type { Product } from '@/lib/types';
import { useCart } from '@/lib/cart';
import { useUserPreferences } from '@/lib/userPreferences';

type Turn = { role: 'assistant' | 'user'; content: string; options?: string[] };

type CartStep = {
  kind: 'cart';
  message: string;
  picks: { product: Product; qty: number; note?: string }[];
  notInCatalog: { name: string; reason?: string }[];
  outOfStock: { product: Product; substitute?: Product | null }[];
};

type QuestionStep = { kind: 'question'; question: string; options: string[] };
type GuidedStep = QuestionStep | CartStep;

const PRESET_GOALS = [
  { id: 'new_parent', label: "I'm a new parent", icon: '👶' },
  { id: 'hostel', label: 'College hostel kit', icon: '🎒' },
  { id: 'vegan_snacks', label: 'Vegan snacks', icon: '🌱' },
  { id: 'house_cleaning', label: 'Clean my whole house', icon: '🧽' },
  { id: 'high_protein', label: 'High-protein breakfast', icon: '💪' },
  { id: 'movie_night', label: 'Movie night with friends', icon: '🍿' },
  { id: 'travel_packing', label: 'Pack for a 5-day trip', icon: '🧳' },
  { id: 'birthday_surprise', label: 'Surprise birthday tonight', icon: '🎂' }
];

const PRESET_LABELS: Record<string, string> = {
  new_parent: "I'm a new parent",
  hostel: "I'm going to college hostel and need a starter kit",
  vegan_snacks: 'I want vegan snacks',
  house_cleaning: 'I want to clean my whole house',
  high_protein: 'I want high-protein breakfast options',
  movie_night: 'Movie night with 4 friends',
  travel_packing: 'Pack for a 5-day domestic trip',
  birthday_surprise: 'Surprise birthday party tonight for 6 people'
};

function GuidedInner() {
  const router = useRouter();
  const params = useSearchParams();
  const cart = useCart();
  const { forAI } = useUserPreferences();

  const initialId = params.get('id') ?? '';
  const initialGoal = params.get('goal') ?? (initialId ? PRESET_LABELS[initialId] : '');

  const [goal, setGoal] = useState<string>(initialGoal);
  const [draft, setDraft] = useState<string>(initialGoal);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [currentStep, setCurrentStep] = useState<GuidedStep | null>(null);
  const [loading, setLoading] = useState(false);
  const startedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (startedRef.current || !initialGoal) return;
    startedRef.current = true;
    startWith(initialGoal);
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, currentStep, loading]);

  const startWith = async (g: string) => {
    if (!g.trim()) return;
    setGoal(g);
    setDraft(g);
    setTurns([]);
    setCurrentStep(null);
    await ask(g, []);
  };

  const ask = async (g: string, history: Turn[]) => {
    setLoading(true);
    try {
      const res = await fetch('/api/guided', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: g, history, preferences: forAI() })
      }).then((r) => r.json());
      setCurrentStep(res);
      if (res.kind === 'question') {
        setTurns((cur) => [...cur, { role: 'assistant', content: res.question, options: res.options }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const onAnswer = async (answer: string) => {
    const next: Turn[] = [...turns, { role: 'user', content: answer }];
    setTurns(next);
    setCurrentStep(null);
    await ask(goal, next);
  };

  const useThisCart = () => {
    if (currentStep?.kind !== 'cart') return;
    cart.addMany(currentStep.picks.map((p) => ({ product: p.product, qty: p.qty, note: p.note })), false);
    router.push(`/checkout?label=${encodeURIComponent('Guided: ' + goal.slice(0, 30))}`);
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="w-9 h-9 rounded-full bg-surface border border-line flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-brand-amber font-semibold flex items-center gap-1">
            <MessageSquareDashed className="w-3 h-3" /> AI guided shopping
          </div>
          <h1 className="text-lg font-semibold leading-tight truncate">{goal || 'What are you shopping for?'}</h1>
        </div>
      </div>

      {!goal && (
        <>
          <div className="card p-3 flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-brand-amber ml-1" />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && startWith(draft)}
              placeholder="Describe what you're shopping for…"
              className="flex-1 bg-transparent outline-none py-2 text-[14px] placeholder:text-ink-400"
            />
            <button onClick={() => startWith(draft)} disabled={!draft.trim()} className="btn-primary py-2 px-4 text-sm">
              Start
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_GOALS.map((p) => (
              <button
                key={p.id}
                onClick={() => startWith(PRESET_LABELS[p.id])}
                className="card p-3 text-left hover:shadow-e2 transition flex items-center gap-2"
              >
                <span className="text-2xl">{p.icon}</span>
                <span className="text-[13px] font-medium">{p.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {goal && (
        <div ref={scrollRef} className="space-y-3 min-h-[200px] max-h-[60vh] overflow-y-auto pr-1">
          <AssistantBubble>
            <div className="text-[14px]">
              Got it — building a kit for: <span className="font-semibold">{goal}</span>
            </div>
          </AssistantBubble>

          {turns.map((t, i) => (
            t.role === 'assistant' ? (
              <AssistantBubble key={i}>
                <div className="text-[14px]">{t.content}</div>
              </AssistantBubble>
            ) : (
              <UserBubble key={i}>
                <div className="text-[13px]">{t.content}</div>
              </UserBubble>
            )
          ))}

          {loading && <AssistantBubble><span className="text-[12px] text-ink-300">thinking…</span></AssistantBubble>}

          <AnimatePresence>
            {currentStep?.kind === 'question' && !loading && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-2 pl-9">
                {currentStep.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => onAnswer(opt)}
                    className="text-left p-3 rounded-xl bg-surface border border-line hover:border-brand-orange hover:bg-muted text-[13px] transition"
                  >
                    {opt}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {currentStep?.kind === 'cart' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <AssistantBubble>
                <div className="text-[14px]">{currentStep.message}</div>
              </AssistantBubble>
              {currentStep.picks.length > 0 && (
                <div className="card p-4 ml-9">
                  <div className="text-[11px] uppercase tracking-wider text-good font-semibold flex items-center gap-1 mb-2">
                    <Sparkles className="w-3 h-3" /> Pulse picked {currentStep.picks.length} items
                  </div>
                  <div className="space-y-2">
                    {currentStep.picks.map((p) => (
                      <div key={p.product.id} className="surface-soft p-2.5 flex items-center gap-2">
                        <div className="text-2xl">{p.product.image}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium truncate">{p.product.name}</div>
                          <div className="text-[10px] text-ink-300">{p.product.brand} · {inr(p.product.price)} · qty {p.qty}{p.note ? ` · ${p.note}` : ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-line flex items-center justify-between">
                    <span className="text-[12px] text-ink-300 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> ETA {Math.max(...currentStep.picks.map((p) => p.product.delivery_eta_minutes), 0)} min
                    </span>
                    <span className="font-bold">{inr(currentStep.picks.reduce((s, p) => s + p.product.price * p.qty, 0))}</span>
                  </div>
                </div>
              )}

              {(currentStep.outOfStock?.length || currentStep.notInCatalog?.length) ? (
                <div className="ml-9">
                  <UnavailableSection
                    outOfStock={currentStep.outOfStock as any}
                    notInCatalog={currentStep.notInCatalog}
                  />
                </div>
              ) : null}

              {currentStep.picks.length > 0 && (
                <div className="ml-9">
                  <button onClick={useThisCart} className="btn-primary w-full">
                    Edit & checkout <ChevronRight className="w-4 h-4" />
                  </button>
                  <div className="mt-2 text-[11px] text-ink-300 text-center">You can adjust quantities or add more items on checkout.</div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

function AssistantBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <div className="w-7 h-7 rounded-full bg-brand-orange/15 border border-brand-orange/30 text-brand-amber flex items-center justify-center shrink-0">
        <Bot className="w-3.5 h-3.5" />
      </div>
      <div className="max-w-[88%] bg-surface border border-line rounded-2xl rounded-tl-md px-3 py-2">{children}</div>
    </div>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 justify-end">
      <div className="max-w-[88%] bg-brand-amber text-white rounded-2xl rounded-tr-md px-3 py-2">{children}</div>
    </div>
  );
}

export default function GuidedPage() {
  return (
    <Suspense fallback={<div className="pt-10 text-ink-300">Loading…</div>}>
      <GuidedInner />
    </Suspense>
  );
}
