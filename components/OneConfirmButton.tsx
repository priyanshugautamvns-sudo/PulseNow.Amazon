'use client';

import { useEffect, useRef, useState } from 'react';
import { Fingerprint, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * OneConfirmButton — long-press to confirm with simulated biometric.
 * Hold for 1 second to fire onConfirm.
 */
export function OneConfirmButton({
  label = 'Hold to confirm with Amazon Pay UPI',
  onConfirm,
  duration = 900,
  disabled
}: {
  label?: string;
  onConfirm: () => void;
  duration?: number;
  disabled?: boolean;
}) {
  const [progress, setProgress] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  const tick = () => {
    if (startRef.current == null) return;
    const elapsed = Date.now() - startRef.current;
    const pct = Math.min(1, elapsed / duration);
    setProgress(pct);
    if (pct >= 1 && !firedRef.current) {
      firedRef.current = true;
      onConfirm();
      cleanup();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const start = () => {
    if (disabled) return;
    firedRef.current = false;
    startRef.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);
  };

  const cleanup = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    startRef.current = null;
    setProgress(0);
  };

  useEffect(() => () => cleanup(), []);

  return (
    <button
      onMouseDown={start}
      onTouchStart={start}
      onMouseUp={cleanup}
      onMouseLeave={cleanup}
      onTouchEnd={cleanup}
      disabled={disabled}
      className="relative w-full overflow-hidden rounded-xl py-3.5 px-5 bg-brand-orange hover:bg-brand-gold text-ink-900 font-semibold shadow-cta active:scale-[0.99] disabled:opacity-50 transition"
    >
      <motion.div
        className="absolute inset-y-0 left-0 bg-ink-900/15"
        animate={{ width: `${progress * 100}%` }}
        transition={{ duration: 0 }}
      />
      <div className="relative flex items-center justify-center gap-2">
        {progress > 0 ? <Fingerprint className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
        <span>{progress > 0 ? `Confirming… ${Math.round(progress * 100)}%` : label}</span>
      </div>
    </button>
  );
}
