'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Product } from './types';

export type CartItem = { product: Product; qty: number; note?: string };

type CartCtx = {
  items: CartItem[];
  count: number;
  total: number;
  add: (product: Product, qty?: number, note?: string) => void;
  addMany: (items: { product: Product; qty?: number; note?: string }[], replace?: boolean) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
const STORAGE_KEY = 'pulse_cart_v1';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items, hydrated]);

  const add = useCallback((product: Product, qty = 1, note?: string) => {
    setItems((cur) => {
      const i = cur.findIndex((it) => it.product.id === product.id);
      if (i >= 0) {
        const next = [...cur];
        next[i] = { ...next[i], qty: next[i].qty + qty };
        return next;
      }
      return [...cur, { product, qty, note }];
    });
  }, []);

  const addMany = useCallback((arr: { product: Product; qty?: number; note?: string }[], replace = false) => {
    setItems((cur) => {
      const base = replace ? [] : [...cur];
      for (const it of arr) {
        const i = base.findIndex((x) => x.product.id === it.product.id);
        const qty = it.qty ?? 1;
        if (i >= 0) {
          base[i] = { ...base[i], qty: replace ? qty : base[i].qty + qty };
        } else {
          base.push({ product: it.product, qty, note: it.note });
        }
      }
      return base;
    });
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setItems((cur) => {
      if (qty <= 0) return cur.filter((it) => it.product.id !== id);
      return cur.map((it) => (it.product.id === id ? { ...it, qty } : it));
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems((cur) => cur.filter((it) => it.product.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const total = useMemo(() => items.reduce((s, it) => s + it.product.price * it.qty, 0), [items]);
  const count = useMemo(() => items.reduce((s, it) => s + it.qty, 0), [items]);

  const value: CartCtx = { items, count, total, add, addMany, setQty, remove, clear };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
