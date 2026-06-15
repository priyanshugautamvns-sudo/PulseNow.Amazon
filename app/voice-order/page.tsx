'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Mic, MicOff, Sparkles, Square, RotateCcw, ChevronRight,
  AlertTriangle, CheckCircle2, Clock
} from 'lucide-react';
import { UnavailableSection } from '@/components/UnavailableSection';
import { useUserPreferences } from '@/lib/userPreferences';
import { useCart } from '@/lib/cart';
import { inr } from '@/lib/format';
import type { Product } from '@/lib/types';

type Result = {
  message: string;
  language: 'english' | 'hindi' | 'hinglish';
  picks: { product: Product; qty: number; note?: string }[];
  outOfStock: { product: Product; substitute?: Product | null }[];
  notInCatalog: { name: string; reason?: string }[];
  source: 'bedrock' | 'recipe' | 'mock';
  error?: string;
};

type Phase =
  | 'idle'
  | 'requesting-mic'
  | 'listening'
  | 'thinking'
  | 'matching'
  | 'ready'
  | 'error';

/**
 * /voice-order
 * --------------------------------------------------------------
 * Single-purpose voice-only ordering screen. On mount, asks for mic
 * permission and immediately starts the Web Speech recogniser. Live
 * transcript is shown while the user speaks. When they stop (or tap
 * Stop), the transcript is sent to /api/smart-cart and the resulting
 * cart is shown as a card.
 */
export default function VoiceOrderPage() {
  const router = useRouter();
  const cart = useCart();
  const { prefs, forAI } = useUserPreferences();

  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [partial, setPartial] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [result, setResult] = useState<Result | null>(null);

  const recRef = useRef<any>(null);
  const cancelledRef = useRef(false);
  // CRITICAL FIX: refs hold the live transcript values so the
  // onend → submitTranscript() callback chain never reads stale state
  // from the closure that was created when the recogniser started.
  const transcriptRef = useRef('');
  const partialRef = useRef('');
  const submittingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      setError('Voice input is not supported in this browser. Try Chrome on Android, or Safari/Chrome on desktop.');
      setPhase('error');
      return;
    }
    // Auto-start recording.
    start();
    return () => stop();
    // eslint-disable-next-line
  }, []);

  const start = () => {
    if (!prefs.voiceEnabled) {
      setError('Voice is turned off in Settings.');
      setPhase('error');
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      setError('Voice input is not supported in this browser.');
      setPhase('error');
      return;
    }

    setError(null);
    transcriptRef.current = '';
    partialRef.current = '';
    submittingRef.current = false;
    setTranscript('');
    setPartial('');
    setResult(null);
    cancelledRef.current = false;

    setPhase('requesting-mic');
    const rec = new SR();
    rec.lang = prefs.language === 'hindi' ? 'hi-IN' : 'en-IN';
    rec.interimResults = true;
    rec.continuous = true;

    rec.onstart = () => {
      setPhase('listening');
    };

    rec.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          // Append final result chunks to the ref synchronously.
          transcriptRef.current = (transcriptRef.current + ' ' + t.trim()).trim();
        } else {
          interim += t;
        }
      }
      partialRef.current = interim;
      // Mirror to React state for the on-screen transcript view.
      setTranscript(transcriptRef.current);
      setPartial(interim);
    };

    rec.onerror = (e: any) => {
      const code = e?.error || 'error';
      if (code === 'not-allowed') setError('Microphone permission was blocked. Allow it from your browser settings.');
      else if (code === 'no-speech') setError('I did not hear anything. Tap Start again.');
      else if (code === 'aborted') return; // user-initiated, do nothing
      else setError('Voice error: ' + code);
      setPhase('error');
    };

    rec.onend = () => {
      if (cancelledRef.current) return;
      // Auto-submit once recogniser ends (silence or user stop).
      submitTranscript();
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch (e: any) {
      setError(e?.message ?? 'Could not start microphone.');
      setPhase('error');
    }
  };

  const stop = () => {
    try {
      recRef.current?.stop();
    } catch {}
    recRef.current = null;
  };

  const cancel = () => {
    cancelledRef.current = true;
    stop();
    setPhase('idle');
    transcriptRef.current = '';
    partialRef.current = '';
    setTranscript('');
    setPartial('');
  };

  const submitTranscript = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    // Read from refs, NOT from stale React state.
    const finalText = (transcriptRef.current + ' ' + partialRef.current).trim();
    if (!finalText) {
      setPhase('error');
      setError('No speech captured. Tap Start to try again.');
      submittingRef.current = false;
      return;
    }
    setPhase('thinking');
    try {
      const res = await fetch('/api/smart-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: finalText, preferences: forAI() })
      });
      setPhase('matching');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Voice request failed');
      setResult({
        message: data.message ?? '',
        language: data.language ?? 'english',
        picks: data.picks ?? [],
        outOfStock: data.outOfStock ?? [],
        notInCatalog: data.notInCatalog ?? [],
        source: data.source ?? 'mock',
        error: data.error
      });
      setPhase('ready');
      try { (navigator as any).vibrate?.(20); } catch {}
    } catch (e: any) {
      setError(e?.message ?? 'AI request failed.');
      setPhase('error');
    } finally {
      submittingRef.current = false;
    }
  };

  const total = result?.picks.reduce((s, p) => s + p.product.price * p.qty, 0) ?? 0;
  const eta = result?.picks.length ? Math.max(...result.picks.map((p) => p.product.delivery_eta_minutes)) : 0;

  const addToCart = () => {
    if (!result?.picks?.length) return;
    cart.addMany(result.picks.map((p) => ({ product: p.product, qty: p.qty, note: p.note })), false);
    router.push('/checkout?label=Voice+order');
  };

  return (
    <div className="space-y-4 pt-4 pb-24">
      <div className="flex items-center gap-2">
        <Link href="/" className="w-9 h-9 rounded-full bg-surface border border-line flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-brand-amber flex items-center gap-1">
            <Mic className="w-3 h-3" /> Voice order
          </div>
          <h1 className="text-lg font-semibold leading-tight">Speak. Pulse builds your cart.</h1>
        </div>
      </div>

      {/* Mic visualiser */}
      <div className="card p-6 text-center">
        <div className="relative inline-flex items-center justify-center">
          <motion.div
            className="absolute w-40 h-40 rounded-full bg-brand-orange/10 border border-brand-orange/20"
            animate={phase === 'listening' ? { scale: [1, 1.15, 1], opacity: [0.6, 0.2, 0.6] } : { scale: 1, opacity: 0.4 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute w-32 h-32 rounded-full bg-brand-orange/15 border border-brand-orange/30"
            animate={phase === 'listening' ? { scale: [1, 1.08, 1], opacity: [0.7, 0.3, 0.7] } : { scale: 1, opacity: 0.4 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
          />
          <button
            onClick={() => {
              if (phase === 'listening') {
                // user-initiated stop -> auto-submit on rec.onend
                stop();
              } else if (phase === 'idle' || phase === 'error') {
                start();
              }
            }}
            disabled={phase === 'thinking' || phase === 'matching'}
            className={`relative w-24 h-24 rounded-full text-white shadow-glow flex items-center justify-center transition ${
              phase === 'listening'
                ? 'bg-gradient-to-br from-bad to-red-700 animate-pulse-glow'
                : 'bg-gradient-to-br from-brand-amber to-brand-deep'
            } disabled:opacity-50`}
            aria-label={phase === 'listening' ? 'Stop and submit' : 'Start voice'}
          >
            {phase === 'listening' ? <Square className="w-9 h-9" fill="currentColor" /> : <Mic className="w-10 h-10" />}
          </button>
        </div>

        <div className="mt-6 text-[12px] uppercase tracking-wider text-brand-amber font-semibold">
          {phase === 'idle' && 'Tap to start'}
          {phase === 'requesting-mic' && 'Asking for microphone…'}
          {phase === 'listening' && 'Listening — speak in English or Hinglish'}
          {phase === 'thinking' && 'Pulse is thinking…'}
          {phase === 'matching' && 'Matching catalog…'}
          {phase === 'ready' && 'Ready'}
          {phase === 'error' && 'Error'}
        </div>

        {/* Voice bars while listening */}
        {phase === 'listening' && (
          <div className="mt-3 flex items-end justify-center gap-1.5 h-8">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <span
                key={i}
                className="w-1.5 rounded-full bg-brand-amber voice-bar"
                style={{ height: '100%', animationDelay: `${i * 0.08}s` }}
              />
            ))}
          </div>
        )}

        {/* Live transcript */}
        {(transcript || partial) && (
          <div className="mt-4 surface-soft p-3 text-left text-[14px]">
            <div className="text-[10px] uppercase tracking-wider text-ink-300 font-semibold mb-1">Transcript</div>
            <div className="text-ink-100">
              {transcript}
              {partial && <span className="text-ink-300"> {partial}</span>}
            </div>
          </div>
        )}

        {/* Manual controls */}
        {(phase === 'listening' || phase === 'idle' || phase === 'error') && (
          <div className="mt-4 flex items-center justify-center gap-2">
            {phase === 'listening' && (
              <button onClick={cancel} className="btn-ghost py-2 px-3 text-[12px]">
                <RotateCcw className="w-4 h-4" /> Cancel
              </button>
            )}
            {phase !== 'listening' && (
              <button onClick={start} className="btn-primary py-2 px-4 text-[13px]">
                <Mic className="w-4 h-4" /> {phase === 'error' ? 'Try again' : 'Start'}
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="surface-soft p-3 text-[13px] text-warn flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {!supported && (
        <div className="card p-4 text-[13px] text-ink-300">
          <div className="flex items-center gap-1.5 text-warn mb-1">
            <MicOff className="w-4 h-4" /> Voice not supported
          </div>
          Use Chrome on Android, Edge/Chrome on Windows, or Safari on macOS. You can still type or upload.
          <Link href="/chat" className="btn-link ml-1">Open Pulse AI chat</Link>
          <span className="text-ink-300"> or </span>
          <Link href="/upload" className="btn-link">Upload page</Link>
        </div>
      )}

      {/* Result card */}
      <AnimatePresence>
        {result && phase === 'ready' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="card p-4">
              <div className="text-[11px] uppercase tracking-wider text-good font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Voice order understood · {result.language}
              </div>
              <div className="text-[14px] mt-1">{result.message}</div>
              <div className="mt-2 text-[11px] text-ink-400 italic">via {result.source === 'bedrock' ? 'Pulse AI' : result.source}</div>
            </div>

            {result.picks.length > 0 ? (
              <>
                <div className="card p-4 space-y-2">
                  {result.picks.map((p) => (
                    <div key={p.product.id} className="surface-soft p-2.5 flex items-center gap-3">
                      <div className="text-2xl">{p.product.image}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium truncate">{p.product.name}</div>
                        <div className="text-[10px] text-ink-300">{p.product.brand}{p.note ? ` · ${p.note}` : ''} · {p.product.delivery_eta_minutes}m</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-ink-300">qty {p.qty}</div>
                        <div className="text-[13px] font-semibold">{inr(p.product.price * p.qty)}</div>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-line flex items-center justify-between text-sm">
                    <span className="text-ink-300 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> ETA {eta} min</span>
                    <span className="font-bold">{inr(total)}</span>
                  </div>
                </div>

                <button onClick={addToCart} className="btn-primary w-full">
                  Add {result.picks.length} item{result.picks.length === 1 ? '' : 's'} to cart <ChevronRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="card p-4 text-[13px] text-ink-300">
                Nothing in the catalog matched your voice order yet. Try saying brand or category names.
              </div>
            )}

            {(result.outOfStock?.length || result.notInCatalog?.length) ? (
              <UnavailableSection outOfStock={result.outOfStock as any} notInCatalog={result.notInCatalog} />
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
