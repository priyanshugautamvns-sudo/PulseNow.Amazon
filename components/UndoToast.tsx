'use client';

import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Check } from 'lucide-react';

/**
 * Undo timing rules:
 *   - Order total ≤ ₹500: 5-second window, no skip option.
 *   - Order total > ₹500: 10-second window with explicit "Confirm now"
 *     button so the user can finalise immediately if they trust it.
 */
export function UndoToast({
  total,
  onUndo,
  onConfirmNow,
  onExpire
}: {
  total: number;
  onUndo: () => void;
  onConfirmNow?: () => void;
  onExpire?: () => void;
}) {
  const isHighValue = total > 500;
  const seconds = isHighValue ? 10 : 5;
  const [left, setLeft] = useState(seconds);
  const startedAt = useRef(Date.now());
  const expiredRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt.current) / 1000);
      const remaining = Math.max(0, seconds - elapsed);
      setLeft(remaining);
      if (remaining <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        clearInterval(id);
        onExpire?.();
      }
    }, 250);
    return () => clearInterval(id);
  }, [seconds, onExpire]);

  const pct = useMemo(() => Math.max(0, Math.min(1, left / seconds)), [left, seconds]);

  if (left <= 0) return null;

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 50, opacity: 0 }}
      className="fixed bottom-24 md:bottom-6 inset-x-4 z-40 max-w-md mx-auto"
    >
      <div className="bg-surface border border-line rounded-2xl px-4 py-3 flex items-center gap-3 shadow-e3">
        {/* Timer ring */}
        <div className="relative w-10 h-10 shrink-0">
          <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="rgb(var(--border-line))" strokeWidth="3" />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="rgb(var(--brand-orange))"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 15}`}
              strokeDashoffset={`${2 * Math.PI * 15 * (1 - pct)}`}
              style={{ transition: 'stroke-dashoffset 250ms linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-[12px] font-bold text-brand-amber">
            {left}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold">Order placed</div>
          <div className="text-[11px] text-ink-300">
            {isHighValue
              ? `Higher-value order: ${seconds}-second safety window.`
              : `Undo available for ${seconds} seconds.`}
          </div>
        </div>

        <button
          onClick={onUndo}
          className="text-bad font-semibold text-[13px] flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-bad/10"
        >
          <X className="w-4 h-4" /> Undo
        </button>

        {isHighValue && onConfirmNow && (
          <button
            onClick={onConfirmNow}
            aria-label="Confirm now"
            className="ml-1 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-good/15 text-good border border-good/30 text-[12px] font-semibold hover:bg-good/20"
          >
            <Check className="w-3.5 h-3.5" /> Confirm now
          </button>
        )}
      </div>
    </motion.div>
  );
}
