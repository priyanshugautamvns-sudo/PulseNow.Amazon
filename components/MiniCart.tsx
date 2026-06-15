'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/lib/cart';
import { inr } from '@/lib/format';
import { usePathname } from 'next/navigation';

export function MiniCart() {
  const { count, total } = useCart();
  const pathname = usePathname();

  const hidden =
    pathname?.startsWith('/checkout') ||
    pathname?.startsWith('/order-success') ||
    pathname?.startsWith('/onboarding') ||
    pathname?.startsWith('/pitch');

  return (
    <AnimatePresence>
      {!hidden && count > 0 && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', damping: 22 }}
          className="fixed inset-x-0 bottom-20 md:bottom-6 z-30 px-4 pointer-events-none"
        >
          <div className="max-w-md md:max-w-3xl mx-auto pointer-events-auto">
            <Link
              href="/checkout"
              className="flex items-center gap-3 bg-brand-navy text-white rounded-xl px-4 py-3 shadow-e3 hover:opacity-90 transition"
            >
              <div className="relative">
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-amber text-canvas text-[10px] font-bold flex items-center justify-center">
                  {count}
                </span>
              </div>
              <div className="flex-1">
                <div className="text-[12px] uppercase tracking-wider text-white/60 font-semibold">Cart</div>
                <div className="text-[14px] font-semibold">{count} {count === 1 ? 'item' : 'items'} · {inr(total)}</div>
              </div>
              <div className="text-[12px] text-brand-gold font-semibold">View →</div>
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
