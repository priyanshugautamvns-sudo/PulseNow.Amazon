'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, Send, Bot, User, ChevronRight } from 'lucide-react';
import { inr } from '@/lib/format';
import type { Product } from '@/lib/types';
import { useCart } from '@/lib/cart';

type Turn = {
  role: 'user' | 'assistant';
  content: string;
  picks?: { product: Product; qty: number; note?: string }[];
  source?: string;
};

const SUGGESTIONS = [
  'I want to make chicken biryani for 4',
  'What can I cook with eggs and bread for breakfast?',
  'Suggest a movie night snack box for 6 friends',
  'My back hurts after a long flight',
  'Plan healthy breakfast for the week',
  'Period care kit, premium please'
];

function ChatInner() {
  const router = useRouter();
  const params = useSearchParams();
  const cart = useCart();
  const initialQ = params.get('q') ?? '';

  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialQ) send(initialQ);
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, loading]);

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message) return;
    setInput('');
    const next: Turn[] = [...turns, { role: 'user', content: message }];
    setTurns(next);
    setLoading(true);
    try {
      const history = next.slice(0, -1).map((t) => ({ role: t.role, content: t.content }));
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history })
      }).then((r) => r.json());
      setTurns([...next, { role: 'assistant', content: res.message, picks: res.picks, source: res.source }]);
    } catch {
      setTurns([...next, { role: 'assistant', content: 'Sorry, I had trouble. Try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const lastAssistant = [...turns].reverse().find((t) => t.role === 'assistant');
  const hasPicks = (lastAssistant?.picks?.length ?? 0) > 0;
  const total = lastAssistant?.picks?.reduce((s, p) => s + p.product.price * p.qty, 0) ?? 0;

  const onUseCart = () => {
    if (!lastAssistant?.picks?.length) return;
    cart.addMany(lastAssistant.picks.map((p) => ({ product: p.product, qty: p.qty, note: p.note })), true);
    router.push('/checkout?label=Pulse+AI+suggestion');
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-160px)] md:h-[calc(100dvh-110px)] pt-2">
      <div className="flex items-center gap-2 mb-2">
        <Link href="/" className="w-9 h-9 rounded-full bg-surface border border-line flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="text-[11px] uppercase tracking-wider text-brand-orange font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Pulse AI
          </div>
          <div className="font-semibold leading-tight">Ask anything about your shopping</div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
        {turns.length === 0 && (
          <div className="card p-4">
            <div className="text-[11px] uppercase tracking-wider text-brand-orange font-semibold">Try asking</div>
            <div className="grid grid-cols-1 gap-2 mt-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left p-3 rounded-xl border border-line hover:border-brand-orange hover:bg-orange-50 text-[13px] transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((t, i) => <TurnBubble key={i} turn={t} />)}

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-[12px] text-ink-500">
            <div className="w-7 h-7 rounded-full bg-orange-50 border border-orange-200 text-[#9C5400] flex items-center justify-center">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <span>Pulse is thinking…</span>
            <div className="flex gap-1 ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-bounce [animation-delay:120ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-bounce [animation-delay:240ms]" />
            </div>
          </motion.div>
        )}
      </div>

      {hasPicks && (
        <div className="card p-3 mt-2 mb-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold">Suggested cart · {lastAssistant!.picks!.length} items</div>
            <div className="font-bold">{inr(total)}</div>
          </div>
          <button onClick={onUseCart} className="btn-primary w-full">
            Edit & checkout <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-surface border border-line rounded-xl p-2 flex items-center gap-2 shadow-e1">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Ask Pulse anything…"
          className="flex-1 bg-transparent outline-none px-2 py-2 text-[14px] placeholder:text-ink-400"
        />
        <button onClick={() => send()} disabled={loading || !input.trim()} className="btn-primary py-2 px-4">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function TurnBubble({ turn }: { turn: Turn }) {
  const isUser = turn.role === 'user';
  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-orange-50 border border-orange-200 text-[#9C5400] flex items-center justify-center shrink-0">
          <Bot className="w-3.5 h-3.5" />
        </div>
      )}
      <div className={`max-w-[88%] ${isUser ? 'order-1' : ''}`}>
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-2xl text-[14px] ${
            isUser ? 'bg-brand-navy text-white rounded-tr-md' : 'bg-surface border border-line rounded-tl-md'
          }`}
        >
          {turn.content}
        </motion.div>
        {turn.picks && turn.picks.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {turn.picks.map((p) => (
              <div key={p.product.id} className="surface-soft p-2 flex items-center gap-2">
                <div className="text-xl">{p.product.image}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-medium truncate">{p.product.name}</div>
                  <div className="text-[10px] text-ink-500">{p.product.brand}{p.note ? ` · ${p.note}` : ''} · {p.product.delivery_eta_minutes}m</div>
                </div>
                <div className="text-[12px] font-semibold">{inr(p.product.price * p.qty)}</div>
              </div>
            ))}
          </div>
        )}
        {turn.source && (
          <div className="text-[10px] text-ink-400 mt-1 ml-1">via {turn.source === 'bedrock' ? 'Bedrock' : turn.source}</div>
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

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="pt-10 text-ink-500">Loading…</div>}>
      <ChatInner />
    </Suspense>
  );
}
