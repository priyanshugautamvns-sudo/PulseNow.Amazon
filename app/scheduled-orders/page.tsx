'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Calendar, Plus, Pause, Play, SkipForward, Trash2, Edit2, ShieldCheck, Clock, X, Check } from 'lucide-react';
import productsRaw from '@/data/products.json';
import type { Product } from '@/lib/types';
import { useScheduledOrders, computeNextRunAt, type ScheduledOrder, type FrequencyType } from '@/lib/scheduledOrders';
import { useUserPreferences } from '@/lib/userPreferences';
import { inr, classNames } from '@/lib/format';

const PRODUCTS = productsRaw as Product[];

const FREQUENCY_LABELS: Record<FrequencyType, string> = {
  daily: 'Every day',
  alternate: 'Alternate days',
  weekly: 'Weekly',
  custom_days: 'Custom days',
  every_n_days: 'Every N days',
  monthly: 'Monthly'
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ScheduledOrdersPage() {
  const { schedules, add, update, remove, pause, resume, skipNext } = useScheduledOrders();
  const { prefs } = useUserPreferences();

  const [editing, setEditing] = useState<ScheduledOrder | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4 pt-4 pb-32">
      <div className="flex items-center gap-2">
        <Link href="/" className="w-9 h-9 rounded-full bg-surface border border-line flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-brand-amber flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Scheduled orders
          </div>
          <h1 className="text-lg font-semibold leading-tight">Auto-reorder schedule</h1>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary py-1.5 px-3 text-[12px]">
          <Plus className="w-4 h-4" /> New
        </button>
      </div>

      <div className="surface-soft p-3 text-[12px] text-ink-300 flex gap-2 items-start">
        <ShieldCheck className="w-4 h-4 mt-0.5 text-good shrink-0" />
        <div>
          For this prototype, scheduled orders never auto-place real orders. We'll always send a confirmation before each run.
          Production wires up to <span className="text-ink-200">EventBridge Scheduler + Lambda + Amazon Pay authorization</span>.
        </div>
      </div>

      {schedules.length === 0 && !creating && (
        <div className="card p-6 text-center">
          <Calendar className="w-6 h-6 mx-auto text-brand-amber" />
          <div className="font-semibold mt-2">No schedules yet</div>
          <div className="text-[12px] text-ink-300 mt-1">Set up "milk every alternate day at 5 PM" or weekly groceries to never run out.</div>
          <button onClick={() => setCreating(true)} className="btn-primary mt-4">
            <Plus className="w-4 h-4" /> Create schedule
          </button>
        </div>
      )}

      <div className="space-y-3">
        {schedules.map((s) => (
          <ScheduleCard
            key={s.id}
            schedule={s}
            onPause={() => pause(s.id)}
            onResume={() => resume(s.id)}
            onSkip={() => skipNext(s.id)}
            onDelete={() => { if (confirm('Delete this schedule?')) remove(s.id); }}
            onEdit={() => setEditing(s)}
          />
        ))}
      </div>

      <AnimatePresence>
        {(creating || editing) && (
          <ScheduleEditor
            initial={editing ?? undefined}
            defaultPayment={prefs.paymentPreference}
            onCancel={() => { setCreating(false); setEditing(null); }}
            onSave={(data) => {
              if (editing) update(editing.id, data);
              else add(data as any);
              setCreating(false);
              setEditing(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ScheduleCard({
  schedule, onPause, onResume, onSkip, onDelete, onEdit
}: {
  schedule: ScheduledOrder;
  onPause: () => void; onResume: () => void; onSkip: () => void; onDelete: () => void; onEdit: () => void;
}) {
  const items = schedule.productIds.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean) as Product[];
  const total = items.reduce((s, p) => s + p.price * (schedule.quantities[p.id] ?? 1), 0);
  const next = new Date(schedule.nextRunAt);

  return (
    <div className={classNames('card p-4', schedule.status === 'paused' && 'opacity-70')}>
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-brand-orange/15 border border-brand-orange/30 text-brand-amber flex items-center justify-center text-xl">
          🗓️
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-semibold text-[14px] truncate">{schedule.label}</div>
            <span className={classNames('pill', schedule.status === 'active' ? 'pill-good' : 'pill-soft')}>
              {schedule.status}
            </span>
          </div>
          <div className="text-[11px] text-ink-300 mt-0.5">
            {FREQUENCY_LABELS[schedule.frequencyType]} · {schedule.time}
            {schedule.frequencyType === 'every_n_days' && ` (every ${schedule.intervalDays} days)`}
            {(schedule.frequencyType === 'weekly' || schedule.frequencyType === 'custom_days') && schedule.daysOfWeek?.length
              ? ` · ${schedule.daysOfWeek.map((d) => DAY_LABELS[d]).join(' · ')}`
              : ''}
          </div>
          <div className="text-[11px] text-brand-amber mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Next: {next.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {items.map((p) => (
          <div key={p.id} className="surface-soft p-2 flex items-center gap-2">
            <div className="text-xl">{p.image}</div>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-medium truncate">{p.name}</div>
              <div className="text-[10px] text-ink-300">qty {schedule.quantities[p.id] ?? 1} · {inr(p.price)}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-[12px] text-ink-300">Per run · <span className="font-semibold text-ink-100">{inr(total)}</span></div>
        <div className="flex items-center gap-1">
          <button onClick={onSkip} className="btn-ghost py-1.5 px-2 text-[12px]"><SkipForward className="w-3.5 h-3.5" /> Skip next</button>
          {schedule.status === 'active' ? (
            <button onClick={onPause} className="btn-ghost py-1.5 px-2 text-[12px]"><Pause className="w-3.5 h-3.5" /> Pause</button>
          ) : (
            <button onClick={onResume} className="btn-ghost py-1.5 px-2 text-[12px]"><Play className="w-3.5 h-3.5" /> Resume</button>
          )}
          <button onClick={onEdit} className="btn-ghost py-1.5 px-2 text-[12px]"><Edit2 className="w-3.5 h-3.5" /></button>
          <button onClick={onDelete} className="btn-ghost py-1.5 px-2 text-[12px] text-bad"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </div>
  );
}

function ScheduleEditor({
  initial, defaultPayment, onCancel, onSave
}: {
  initial?: ScheduledOrder;
  defaultPayment: string;
  onCancel: () => void;
  onSave: (data: any) => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [productIds, setProductIds] = useState<string[]>(initial?.productIds ?? ['p_milk_amul_1l']);
  const [quantities, setQuantities] = useState<Record<string, number>>(initial?.quantities ?? { p_milk_amul_1l: 2 });
  const [frequencyType, setFrequencyType] = useState<FrequencyType>(initial?.frequencyType ?? 'alternate');
  const [intervalDays, setIntervalDays] = useState<number>(initial?.intervalDays ?? 3);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(initial?.daysOfWeek ?? [1]);
  const [time, setTime] = useState<string>(initial?.time ?? '17:00');
  const [startDate, setStartDate] = useState<string>(initial?.startDate ?? new Date().toISOString().slice(0, 10));
  const [confirmBeforeOrder, setConfirmBeforeOrder] = useState<boolean>(initial?.confirmBeforeOrder ?? true);
  const [substitutePolicy, setSubstitutePolicy] = useState<'auto' | 'ask' | 'never'>(initial?.substitutePolicy ?? 'ask');

  const previewNext = useMemo(
    () => computeNextRunAt({ frequencyType, intervalDays, daysOfWeek, time, startDate }),
    [frequencyType, intervalDays, daysOfWeek, time, startDate]
  );

  const toggleProduct = (id: string) => {
    if (productIds.includes(id)) {
      setProductIds((arr) => arr.filter((x) => x !== id));
      const next = { ...quantities };
      delete next[id];
      setQuantities(next);
    } else {
      setProductIds((arr) => [...arr, id]);
      setQuantities((q) => ({ ...q, [id]: 1 }));
    }
  };

  const toggleDay = (d: number) => setDaysOfWeek((arr) => arr.includes(d) ? arr.filter((x) => x !== d) : [...arr, d]);

  const labelFromState = useMemo(() => {
    const products = productIds.map((id) => PRODUCTS.find((p) => p.id === id)?.name?.split(' ').slice(0, 2).join(' ')).filter(Boolean);
    const head = products.join(' + ').slice(0, 36) || 'Schedule';
    const freq = FREQUENCY_LABELS[frequencyType].toLowerCase();
    return `${head} · ${freq} · ${time}`;
  }, [productIds, frequencyType, time]);

  const save = () => {
    if (productIds.length === 0) return;
    onSave({
      userId: 'u_priya',
      productIds,
      quantities,
      frequencyType,
      intervalDays,
      daysOfWeek,
      time,
      startDate,
      endDate: null,
      addressLabel: 'Home',
      paymentMethod: defaultPayment,
      confirmBeforeOrder,
      substitutePolicy,
      label: label.trim() || labelFromState
    });
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26 }}
        className="fixed bottom-0 inset-x-0 z-50 max-w-md mx-auto"
      >
        <div className="bg-surface border-t border-x border-line rounded-t-3xl p-4 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center gap-2 mb-3">
            <div className="font-semibold flex-1">{initial ? 'Edit schedule' : 'New schedule'}</div>
            <button onClick={onCancel} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
          </div>

          <Section title="Items">
            <div className="grid grid-cols-2 gap-2">
              {PRODUCTS.filter((p) => p.stock_count > 0).slice(0, 12).map((p) => {
                const active = productIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleProduct(p.id)}
                    className={classNames(
                      'text-left p-2 rounded-xl border flex items-center gap-2 transition',
                      active ? 'bg-brand-orange/12 border-brand-orange/50' : 'bg-canvas border-line'
                    )}
                  >
                    <div className="text-lg">{p.image}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-medium truncate">{p.name}</div>
                      <div className="text-[10px] text-ink-300">{inr(p.price)}</div>
                    </div>
                    {active && (
                      <input
                        type="number"
                        min={1}
                        value={quantities[p.id] ?? 1}
                        onChange={(e) => setQuantities((q) => ({ ...q, [p.id]: Math.max(1, parseInt(e.target.value || '1', 10)) }))}
                        onClick={(e) => e.stopPropagation()}
                        className="w-12 bg-canvas border border-line rounded-md px-1 py-0.5 text-[12px] text-center"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Frequency">
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(FREQUENCY_LABELS) as FrequencyType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFrequencyType(f)}
                  className={classNames(
                    'p-2 rounded-lg border text-[11px] font-medium transition',
                    frequencyType === f ? 'bg-brand-orange/12 border-brand-orange/50 text-brand-amber' : 'bg-canvas border-line text-ink-200'
                  )}
                >
                  {FREQUENCY_LABELS[f]}
                </button>
              ))}
            </div>

            {frequencyType === 'every_n_days' && (
              <div className="mt-2">
                <label className="text-[11px] text-ink-300">Every N days</label>
                <input
                  type="number"
                  min={1}
                  value={intervalDays}
                  onChange={(e) => setIntervalDays(Math.max(1, parseInt(e.target.value || '1', 10)))}
                  className="ml-2 w-16 bg-canvas border border-line rounded-md px-1 py-1 text-[12px] text-center"
                />
              </div>
            )}

            {(frequencyType === 'weekly' || frequencyType === 'custom_days') && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {DAY_LABELS.map((d, i) => (
                  <button
                    key={d}
                    onClick={() => toggleDay(i)}
                    className={classNames(
                      'px-2.5 py-1 rounded-full border text-[11px]',
                      daysOfWeek.includes(i) ? 'bg-brand-orange/12 border-brand-orange/50 text-brand-amber' : 'bg-canvas border-line text-ink-200'
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
          </Section>

          <Section title="Time and start">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-ink-300">Time</label>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-canvas border border-line rounded-lg px-2 py-2 text-[13px] mt-1" />
              </div>
              <div>
                <label className="text-[11px] text-ink-300">Start date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-canvas border border-line rounded-lg px-2 py-2 text-[13px] mt-1" />
              </div>
            </div>
            <div className="mt-2 text-[11px] text-ink-300 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> First run: {new Date(previewNext).toLocaleString()}
            </div>
          </Section>

          <Section title="Trust controls">
            <ToggleRow on={confirmBeforeOrder} onChange={setConfirmBeforeOrder} title="Confirm before each order" />
            <div className="mt-2">
              <label className="text-[11px] text-ink-300">If a product is out of stock</label>
              <div className="grid grid-cols-3 gap-1.5 mt-1">
                {(['ask', 'auto', 'never'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setSubstitutePolicy(v)}
                    className={classNames(
                      'p-2 rounded-lg border text-[11px] font-medium',
                      substitutePolicy === v ? 'bg-brand-orange/12 border-brand-orange/50 text-brand-amber' : 'bg-canvas border-line text-ink-200'
                    )}
                  >
                    {v === 'ask' ? 'Ask me' : v === 'auto' ? 'Auto substitute' : 'Skip item'}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          <Section title="Label (optional)">
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={labelFromState} className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-[13px]" />
          </Section>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <button onClick={onCancel} className="btn-ghost">Cancel</button>
            <button onClick={save} className="btn-primary"><Check className="w-4 h-4" /> Save schedule</button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <div className="text-[11px] uppercase tracking-wider text-ink-300 font-semibold mb-1.5">{title}</div>
      {children}
    </div>
  );
}

function ToggleRow({ on, onChange, title }: { on: boolean; onChange: (v: boolean) => void; title: string }) {
  return (
    <div className="surface-soft p-3 flex items-center gap-2">
      <div className="text-[13px] font-medium flex-1">{title}</div>
      <button
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={classNames('relative w-11 h-6 rounded-full transition', on ? 'bg-brand-orange' : 'bg-muted border border-line')}
      >
        <span className={classNames('absolute top-0.5 w-5 h-5 rounded-full bg-white transition', on ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </div>
  );
}
