'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, Wallet, Clock, ShieldCheck, Sparkles, Plus, Minus, X, Search } from 'lucide-react';
import productsRaw from '@/data/products.json';
import userProfileRaw from '@/data/userProfile.json';
import type { Product } from '@/lib/types';
import { OneConfirmButton } from '@/components/OneConfirmButton';
import { inr } from '@/lib/format';
import { useCart } from '@/lib/cart';
import { useOrders } from '@/lib/orders';
import { useUserPreferences } from '@/lib/userPreferences';

const PRODUCTS = productsRaw as Product[];
const USER = userProfileRaw as any;

function CheckoutInner() {
  const router = useRouter();
  const params = useSearchParams();
  const cart = useCart();
  const orders = useOrders();
  const { prefs } = useUserPreferences();
  const label = params.get('label') ?? 'Pulse cart';

  // Hydrate cart from URL once (legacy links)
  useEffect(() => {
    const idsParam = params.get('items');
    if (!idsParam) return;
    const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
    const counts: Record<string, number> = {};
    for (const id of ids) counts[id] = (counts[id] ?? 0) + 1;
    const seedItems = Object.entries(counts)
      .map(([id, qty]) => {
        const product = PRODUCTS.find((p) => p.id === id);
        return product ? { product, qty } : null;
      })
      .filter(Boolean) as { product: Product; qty: number }[];
    if (seedItems.length) cart.addMany(seedItems, true);
    const next = new URLSearchParams(Array.from(params.entries()));
    next.delete('items');
    router.replace(`/checkout?${next.toString()}`);
    // eslint-disable-next-line
  }, []);

  const items = cart.items;
  const total = cart.total;
  const eta = useMemo(() => items.reduce((m, it) => Math.max(m, it.product.delivery_eta_minutes), 0), [items]);

  const [placing, setPlacing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const placeOrder = async () => {
    if (items.length === 0 || placing) return;
    setPlacing(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((it) => ({ product: it.product, qty: it.qty })),
          payment_method: prefs.paymentPreference
        })
      }).then((r) => r.json());

      // Persist order locally so Profile / Orders panel can show it.
      orders.add({
        id: res.order_id,
        placed_at: res.placed_at ?? new Date().toISOString(),
        eta_minutes: res.eta_minutes,
        total: res.total,
        label,
        items: items.map((it) => ({ product: it.product, qty: it.qty })),
        status: 'placed',
        payment: res.payment_method ?? prefs.paymentPreference
      });

      const ids = items.flatMap((it) => Array(it.qty).fill(it.product.id)).join(',');
      cart.clear();
      router.push(`/order-success?order=${res.order_id}&eta=${res.eta_minutes}&total=${res.total}&label=${encodeURIComponent(label)}&items=${encodeURIComponent(ids)}`);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="w-9 h-9 rounded-full bg-surface border border-line flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="text-[11px] uppercase tracking-wider text-brand-amber font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> OneConfirm
          </div>
          <h1 className="text-lg font-semibold leading-tight">{label}</h1>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="h-eyebrow">Cart · {cart.count} {cart.count === 1 ? 'item' : 'items'}</div>
          <button onClick={() => setSearchOpen((s) => !s)} className="text-[12px] text-info font-semibold flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add item
          </button>
        </div>

        <AnimatePresence>{searchOpen && <SearchAdd onClose={() => setSearchOpen(false)} />}</AnimatePresence>

        {items.length === 0 && (
          <div className="text-[14px] text-ink-300 py-6 text-center">
            Your cart is empty.
            <div className="mt-3">
              <Link href="/" className="btn-primary inline-flex">Start shopping</Link>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {items.map((it) => (
            <motion.div
              key={it.product.id}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="surface-soft p-2.5 flex items-center gap-3"
            >
              <div className="text-2xl shrink-0">{it.product.image}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">{it.product.name}</div>
                <div className="text-[11px] text-ink-300">{it.product.brand} · {it.product.delivery_eta_minutes}m · {inr(it.product.price)} each</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => cart.setQty(it.product.id, it.qty - 1)} className="w-7 h-7 rounded-lg bg-surface border border-line flex items-center justify-center hover:bg-muted" aria-label="Decrease">
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="min-w-[28px] text-center font-semibold text-[13px]">{it.qty}</div>
                <button onClick={() => cart.setQty(it.product.id, it.qty + 1)} className="w-7 h-7 rounded-lg bg-surface border border-line flex items-center justify-center hover:bg-muted" aria-label="Increase">
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => cart.remove(it.product.id)} className="ml-1 w-7 h-7 rounded-lg text-bad hover:bg-bad/10 flex items-center justify-center" aria-label="Remove">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="mt-3 pt-3 border-t border-line flex items-center justify-between">
            <span className="text-[13px] text-ink-300 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> ETA {eta} min</span>
            <span className="font-bold text-lg">{inr(total)}</span>
          </div>
        )}
      </div>

      <div className="card p-4">
        <div className="h-eyebrow mb-2">Delivery</div>
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 mt-0.5 text-brand-amber shrink-0" />
          <div className="text-[14px] flex-1">
            <div className="font-medium">{USER.address.label}</div>
            <div className="text-ink-300">{USER.address.line}, {USER.address.pincode}</div>
          </div>
          <button className="text-info text-[12px]">Change</button>
        </div>
      </div>

      <div className="card p-4">
        <div className="h-eyebrow mb-2">Payment</div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-orange/15 text-brand-amber border border-brand-orange/30 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-[14px] font-semibold">
              {prefs.paymentPreference === 'card' ? 'Saved card' : prefs.paymentPreference === 'cod' ? 'Cash on delivery' : 'Amazon Pay UPI'}
            </div>
            <div className="text-[11px] text-ink-300">
              {prefs.paymentPreference === 'amazon_pay_upi' ? `${USER.payment.linked_upi} · Balance ${inr(USER.payment.amazon_pay_balance)}` : 'Mock payment for demo'}
            </div>
          </div>
          <button className="text-info text-[12px]">Switch</button>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-300">
          <ShieldCheck className="w-3.5 h-3.5 text-good" /> Biometric required · 5-second undo on every order
        </div>
      </div>

      <OneConfirmButton onConfirm={placeOrder} label={placing ? 'Placing…' : `Hold to pay ${inr(total)}`} disabled={placing || items.length === 0} />

      <div className="text-[11px] text-ink-400 text-center">
        Production version uses Amazon Pay UPI + secure biometric. This demo simulates payment only.
      </div>
    </div>
  );
}

function SearchAdd({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const cart = useCart();
  const matches = useMemo(() => {
    if (!q.trim()) return [];
    const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    return PRODUCTS
      .filter((p) => {
        const hay = `${p.name} ${p.brand} ${p.category} ${p.tags.join(' ')}`.toLowerCase();
        return tokens.every((t) => hay.includes(t));
      })
      .slice(0, 6);
  }, [q]);

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-3">
      <div className="surface-soft p-2 flex items-center gap-2">
        <Search className="w-4 h-4 text-ink-400 ml-1" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search to add (milk, dolo, lays…)"
          className="flex-1 bg-transparent outline-none py-1.5 text-[13px]"
        />
        <button onClick={onClose} className="text-[11px] text-ink-300">close</button>
      </div>
      {matches.length > 0 && (
        <div className="mt-2 space-y-1">
          {matches.map((p) => (
            <button
              key={p.id}
              onClick={() => { cart.add(p, 1); setQ(''); }}
              className="w-full surface-soft p-2 flex items-center gap-2 text-left hover:bg-muted transition"
            >
              <div className="text-xl">{p.image}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium truncate">{p.name}</div>
                <div className="text-[10px] text-ink-300">{p.brand} · {inr(p.price)}</div>
              </div>
              <Plus className="w-4 h-4 text-info" />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="pt-10 text-ink-300">Loading…</div>}>
      <CheckoutInner />
    </Suspense>
  );
}
