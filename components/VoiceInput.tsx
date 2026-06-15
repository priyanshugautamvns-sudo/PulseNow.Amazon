'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserPreferences } from '@/lib/userPreferences';

/**
 * VoiceInput — Web Speech API.
 * Production target: Amazon Transcribe Streaming (websocket).
 *
 * Props:
 *   - onTranscript: called with the final transcript when the user stops
 *   - compact: render as small icon button
 *   - lang: locale; defaults to 'en-IN' (good for Hinglish)
 */
type Props = {
  onTranscript: (text: string) => void;
  compact?: boolean;
  lang?: string;
  ariaLabel?: string;
};

export function VoiceInput({ onTranscript, compact, lang, ariaLabel }: Props) {
  const { prefs } = useUserPreferences();
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState('');
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  const stop = () => {
    setListening(false);
    try {
      recRef.current?.stop();
    } catch {}
    recRef.current = null;
  };

  const start = () => {
    if (!prefs.voiceEnabled) {
      setError('Voice is turned off in Settings.');
      return;
    }
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      setError('Voice input is not supported in this browser. Type your need here.');
      return;
    }
    setError(null);
    setPartial('');
    const rec = new SR();
    rec.lang = lang ?? (prefs.language === 'hindi' ? 'hi-IN' : 'en-IN');
    rec.interimResults = true;
    rec.continuous = false;

    rec.onresult = (e: any) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      if (interim) setPartial(interim);
      if (final) {
        setPartial(final);
        try { (navigator as any).vibrate?.(20); } catch {}
        onTranscript(final.trim());
        stop();
      }
    };
    rec.onerror = (e: any) => {
      const code = e?.error || 'error';
      if (code === 'not-allowed') setError('Microphone permission was blocked. Type your need here.');
      else if (code === 'no-speech') setError('I did not hear anything. Try again.');
      else setError('Voice error. Try again.');
      stop();
    };
    rec.onend = () => stop();

    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  const onClick = () => (listening ? stop() : start());

  return (
    <>
      <button
        onClick={onClick}
        aria-label={ariaLabel ?? (listening ? 'Stop listening' : 'Start voice input')}
        title={listening ? 'Listening… tap to stop' : 'Speak in English or Hinglish'}
        className={`${
          compact
            ? 'w-10 h-10 rounded-xl border border-line bg-surface hover:bg-muted'
            : 'w-12 h-12 rounded-2xl border border-line bg-surface hover:bg-muted'
        } inline-flex items-center justify-center relative transition ${
          listening ? 'border-brand-orange/60 bg-brand-orange/10 animate-pulse-glow' : ''
        }`}
      >
        {listening ? <Mic className="w-5 h-5 text-brand-amber" /> : supported ? <Mic className="w-5 h-5 text-ink-200" /> : <MicOff className="w-5 h-5 text-ink-400" />}
      </button>

      <AnimatePresence>
        {listening && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed inset-x-4 bottom-28 md:bottom-10 z-40 max-w-md mx-auto"
          >
            <div className="glass p-4 rounded-2xl shadow-e3">
              <div className="flex items-center gap-3">
                <div className="flex items-end gap-1 h-6">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className="w-1 rounded-full bg-brand-amber voice-bar"
                      style={{ height: '100%', animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-brand-amber font-semibold">Listening</div>
                  <div className="text-[14px] text-ink-100 mt-0.5 truncate">{partial || 'Speak in English or Hinglish…'}</div>
                </div>
                <button onClick={stop} className="btn-ghost py-1.5 text-[12px]">
                  Stop
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onAnimationComplete={() => setTimeout(() => setError(null), 3500)}
            className="fixed inset-x-4 bottom-28 md:bottom-10 z-40 max-w-md mx-auto"
          >
            <div className="surface-soft p-3 text-[13px] text-warn flex items-center gap-2">
              <MicOff className="w-4 h-4" /> {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
