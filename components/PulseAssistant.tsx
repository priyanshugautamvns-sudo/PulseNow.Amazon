'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Bot, User, ChevronRight } from 'lucide-react';
import { useUserPreferences } from '@/lib/userPreferences';
import { useCart } from '@/lib/cart';
import { VoiceInput } from './VoiceInput';
import { UnavailableSection } from './UnavailableSection';
import { inr } from '@/lib/format';
import type { Product } from '@/lib/types';

type Pick = { product: Product; qty: number; note?: string };
type OOS = { product: Product; substitute?: Product | null };
type NIC = { name: string; reason?: string };
type Turn = { role: 'user' | 'assistant'; content: string; picks?: Pick[]; outOfStock?: OOS[]; notInCatalog?: NIC[]; warnings?: string[]; source?: string };

export function PulseAssistant() {
  const router = useRouter();
  const pathname = usePathname();
  const cart = useCart();
  const { forAI, hydrated } = useUserPreferences();

  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, loading]);

  // Hide on full-screen flows. Done AFTER hooks so we don't violate hooks rules.
  const hidden =
    !hydrated ||
    pathname?.startsWith('/onboarding') ||
    pathname?.startsWith('/pitch');
  if (hidden) return null;

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message) return;
    setInput('');
    const next: Turn[] = [...turns, { role: 'user', content: message }];
    setTurns(next);
    setLoading(true);
    try {
      const res = await fetch('/api/smart-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: message, preferences: forAI() })
      }).then((r) => r.json());
      setTurns([...next, {
        role: 'assistant',
        content: res.message ?? 'Here are some picks.',
        picks: res.picks ?? [],
        outOfStock: res.outOfStock ?? [],
        notInCatalog: res.notInCatalog ?? [],
        warnings: res.warnings ?? [],
        source: res.source
      }]);
    } catch {
      setTurns([...next, { role: 'assistant', content: 'Sorry, I had trouble. Try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const useCartFromTurn = (picks: Pick[]) => {
    cart.addMany(picks.map((p) => ({ product: p.product, qty: p.qty, note: p.note })), false);
    setOpen(false);
    router.push('/checkout?label=Pulse+AI');
  };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setOpen(true)}
            aria-label="Open Pulse AI assistant"
            className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-30 w-14 h-14 rounded-full bg-gradient-to-br from-brand-amber to-brand-deep text-white shadow-glow active:scale-95 transition flex items-center justify-center animate-pulse-glow"
          >
            <Sparkles className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26 }}
              className="fixed bottom-0 inset-x-0 z-50 max-w-md mx-auto"
            >
              <div className="bg-surface border-t border-x border-line rounded-t-3xl flex flex-col shadow-e3 max-h-[80vh]">
                <div className="px-5 py-3 flex items-center gap-3 border-b border-line">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-amber to-brand-deep flex items-center justify-center text-white">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] uppercase tracking-wider text-brand-amber font-semibold">Pulse AI</div>
                    <div className="text-[14px] font-semibold">Ask anything about your shopping</div>
                  </div>
                  <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center" aria-label="Close">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[160px]">
                  {turns.length === 0 && (
                    <div className="space-y-2">
                      {[
                        'Make my cart vegan',
                        'Suggest snacks for movie night with 4 friends',
                        'I want to make poha',
                        'Show only fastest delivery items',
                        'I need ingredients for pav bhaji'
                      ].map((s) => (
                        <button
                          key={s}
                          onClick={() => send(s)}
                          className="w-full text-left p-3 rounded-xl border border-line bg-surface hover:border-brand-orange/40 hover:bg-muted text-[13px] transition"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                  {turns.map((t, i) => <Bubble key={i} turn={t} onUseCart={useCartFromTurn} />)}
                  {loading && (
                    <div className="flex items-center gap-2 text-[12px] text-ink-300">
                      <div className="w-7 h-7 rounded-full bg-brand-orange/15 border border-brand-orange/30 text-brand-amber flex items-center justify-center">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                      <span>Thinking…</span>
                      <div className="flex gap-1 ml-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-amber animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-amber animate-bounce [animation-delay:120ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-amber animate-bounce [animation-delay:240ms]" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 border-t border-line flex items-center gap-2">
                  <VoiceInput compact onTranscript={(t) => send(t)} ariaLabel="Voice input" />
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), send())}
                    placeholder="Ask Pulse anything…"
                    className="flex-1 bg-canvas border border-line rounded-xl px-3 py-2 text-[14px] outline-none focus:border-brand-orange/40"
                  />
                  <button onClick={() => send()} disabled={loading || !input.trim()} className="btn-primary py-2 px-4 disabled:opacity-50">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function Bubble({ turn, onUseCart }: { turn: Turn; onUseCart: (picks: Pick[]) => void }) {
  const isUser = turn.role === 'user';
  const total = turn.picks?.reduce((s, p) => s + p.product.price * p.qty, 0) ?? 0;
  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-brand-orange/15 border border-brand-orange/30 text-brand-amber flex items-center justify-center shrink-0">
          <Bot className="w-3.5 h-3.5" />
        </div>
      )}
      <div className={`max-w-[88%] ${isUser ? 'order-1' : ''}`}>
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-2xl text-[14px] ${
            isUser ? 'bg-brand-amber text-white rounded-tr-md font-medium' : 'bg-muted border border-line rounded-tl-md text-ink-100'
          }`}
        >
          {turn.content}
        </motion.div>

        {(turn.warnings ?? []).map((w, i) => (
          <div key={i} className="mt-1.5 text-[11px] text-warn flex gap-1.5 ml-1">⚠ {w}</div>
        ))}

        {turn.picks && turn.picks.length > 0 && (
          <>
            <div className="mt-2 space-y-1.5">
              {turn.picks.map((p) => (
                <div key={p.product.id} className="surface-soft p-2 flex items-center gap-2">
                  <div className="text-xl">{p.product.image}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium truncate">{p.product.name}</div>
                    <div className="text-[10px] text-ink-300">{p.product.brand}{p.note ? ` · ${p.note}` : ''} · {p.product.delivery_eta_minutes}m</div>
                  </div>
                  <div className="text-[12px] font-semibold">{inr(p.product.price * p.qty)}</div>
                </div>
              ))}
            </div>
            <button onClick={() => onUseCart(turn.picks!)} className="mt-2 w-full btn-primary py-2 text-[13px]">
              Add to cart · {inr(total)} <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {(turn.outOfStock?.length || turn.notInCatalog?.length) && (
          <div className="mt-2">
            <UnavailableSection
              outOfStock={turn.outOfStock as any}
              notInCatalog={turn.notInCatalog}
              compact
            />
          </div>
        )}

        {turn.source && (
          <div className="text-[10px] text-ink-400 mt-1 ml-1">via {turn.source === 'bedrock' ? 'Claude Sonnet' : turn.source}</div>
        )}
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-muted border border-line flex items-center justify-center shrink-0 order-2">
          <User className="w-3.5 h-3.5" />
        </div>
      )}
    </div>
  );
}
