'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type FrequencyType = 'daily' | 'alternate' | 'weekly' | 'custom_days' | 'every_n_days' | 'monthly';

export type ScheduledOrder = {
  id: string;
  userId: string;
  productIds: string[];
  quantities: Record<string, number>;
  frequencyType: FrequencyType;
  intervalDays?: number;     // for every_n_days / alternate
  daysOfWeek?: number[];     // 0-6 (Sun-Sat) for weekly / custom_days
  time: string;              // HH:mm 24h
  startDate: string;         // ISO date
  endDate: string | null;
  nextRunAt: string;         // ISO datetime
  addressLabel: string;
  paymentMethod: string;
  status: 'active' | 'paused' | 'cancelled';
  confirmBeforeOrder: boolean;
  substitutePolicy: 'auto' | 'ask' | 'never';
  label: string;
  createdAt: string;
};

type Ctx = {
  schedules: ScheduledOrder[];
  hydrated: boolean;
  add: (s: Omit<ScheduledOrder, 'id' | 'createdAt' | 'nextRunAt' | 'status'> & { status?: ScheduledOrder['status'] }) => ScheduledOrder;
  update: (id: string, patch: Partial<ScheduledOrder>) => void;
  remove: (id: string) => void;
  pause: (id: string) => void;
  resume: (id: string) => void;
  skipNext: (id: string) => void;
  clear: () => void;
};

const Context = createContext<Ctx | null>(null);
const STORAGE_KEY = 'pulse_schedules_v1';

export function computeNextRunAt(s: Pick<ScheduledOrder, 'frequencyType' | 'intervalDays' | 'daysOfWeek' | 'time' | 'startDate'>): string {
  const now = new Date();
  const start = new Date(s.startDate ?? now.toISOString());
  const [hh, mm] = (s.time ?? '08:00').split(':').map((x) => parseInt(x, 10));

  const stepDays = (() => {
    if (s.frequencyType === 'daily') return 1;
    if (s.frequencyType === 'alternate') return 2;
    if (s.frequencyType === 'every_n_days') return Math.max(1, s.intervalDays ?? 3);
    return 1;
  })();

  // Find the next valid datetime from "max(today, startDate)".
  const cursor = new Date(Math.max(now.getTime(), start.getTime()));
  cursor.setHours(hh || 0, mm || 0, 0, 0);
  if (cursor.getTime() <= now.getTime()) cursor.setDate(cursor.getDate() + stepDays);

  if (s.frequencyType === 'weekly' || s.frequencyType === 'custom_days') {
    const allowed = (s.daysOfWeek && s.daysOfWeek.length ? s.daysOfWeek : [1]); // default Mon
    for (let i = 0; i < 14; i++) {
      const d = new Date(cursor);
      d.setDate(cursor.getDate() + i);
      if (allowed.includes(d.getDay())) {
        d.setHours(hh || 0, mm || 0, 0, 0);
        if (d.getTime() > now.getTime()) return d.toISOString();
      }
    }
  }

  if (s.frequencyType === 'monthly') {
    const d = new Date(cursor);
    if (d.getTime() <= now.getTime()) d.setMonth(d.getMonth() + 1);
    return d.toISOString();
  }

  return cursor.toISOString();
}

function makeId() { return 's_' + Math.random().toString(36).slice(2, 10); }

export function ScheduledOrdersProvider({ children }: { children: React.ReactNode }) {
  const [schedules, setSchedules] = useState<ScheduledOrder[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setSchedules(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules)); } catch {}
  }, [schedules, hydrated]);

  const add: Ctx['add'] = useCallback((data) => {
    const next: ScheduledOrder = {
      id: makeId(),
      createdAt: new Date().toISOString(),
      status: data.status ?? 'active',
      nextRunAt: computeNextRunAt(data),
      ...data
    } as ScheduledOrder;
    setSchedules((cur) => [next, ...cur]);
    return next;
  }, []);

  const update: Ctx['update'] = useCallback((id, patch) => {
    setSchedules((cur) =>
      cur.map((s) => {
        if (s.id !== id) return s;
        const merged = { ...s, ...patch } as ScheduledOrder;
        merged.nextRunAt = computeNextRunAt(merged);
        return merged;
      })
    );
  }, []);

  const remove: Ctx['remove'] = useCallback((id) => setSchedules((cur) => cur.filter((s) => s.id !== id)), []);
  const pause: Ctx['pause'] = useCallback((id) => update(id, { status: 'paused' }), [update]);
  const resume: Ctx['resume'] = useCallback((id) => update(id, { status: 'active' }), [update]);
  const skipNext: Ctx['skipNext'] = useCallback((id) => {
    setSchedules((cur) =>
      cur.map((s) => {
        if (s.id !== id) return s;
        const skipped = new Date(s.nextRunAt);
        skipped.setDate(skipped.getDate() + (s.intervalDays ?? 1));
        return { ...s, nextRunAt: skipped.toISOString() };
      })
    );
  }, []);
  const clear = useCallback(() => setSchedules([]), []);

  const value = useMemo<Ctx>(() => ({ schedules, hydrated, add, update, remove, pause, resume, skipNext, clear }),
    [schedules, hydrated, add, update, remove, pause, resume, skipNext, clear]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useScheduledOrders(): Ctx {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useScheduledOrders must be used inside ScheduledOrdersProvider');
  return ctx;
}
