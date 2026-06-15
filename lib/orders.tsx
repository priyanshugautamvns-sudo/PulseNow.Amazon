'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Product } from './types';

export type OrderItem = { product: Product; qty: number };

export type Order = {
  id: string;
  placed_at: string;        // ISO timestamp
  eta_minutes: number;
  total: number;
  label: string;
  items: OrderItem[];
  status: 'placed' | 'undone';
  payment: string;
};

type Ctx = {
  orders: Order[];
  hydrated: boolean;
  add: (o: Order) => void;
  cancel: (id: string) => void;
  clear: () => void;
};

const Context = createContext<Ctx | null>(null);
const STORAGE_KEY = 'pulse_orders_v1';

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setOrders(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders)); } catch {}
  }, [orders, hydrated]);

  const add = useCallback((o: Order) => {
    setOrders((cur) => [o, ...cur].slice(0, 50));
  }, []);
  const cancel = useCallback((id: string) => {
    setOrders((cur) => cur.map((o) => (o.id === id ? { ...o, status: 'undone' as const } : o)));
  }, []);
  const clear = useCallback(() => setOrders([]), []);

  const value = useMemo(() => ({ orders, hydrated, add, cancel, clear }), [orders, hydrated, add, cancel, clear]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useOrders(): Ctx {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useOrders must be used inside OrdersProvider');
  return ctx;
}
