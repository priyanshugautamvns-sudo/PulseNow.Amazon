'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, User, Settings, ShoppingBag, MapPin, CreditCard, ShieldCheck,
  Sparkles, Mic, Camera, Globe, Bell, LogOut, Trash2, ChevronRight,
  BarChart3, Presentation, Sun, Moon, Clock, Cpu, RefreshCw
} from 'lucide-react';
import { useUserPreferences, type UserPreferences } from '@/lib/userPreferences';
import { useOrders } from '@/lib/orders';
import { inr } from '@/lib/format';
import { useAIStatus } from './AIStatus';

export function FeaturePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { prefs, update, reset } = useUserPreferences();
  const { orders, clear: clearOrders } = useOrders();
  const [tab, setTab] = useState<'profile' | 'preferences' | 'settings' | 'privacy'>('profile');

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26 }}
            className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-surface border-l border-line shadow-e3 flex flex-col"
          >
            <div className="px-5 py-4 flex items-center gap-3 border-b border-line">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-amber to-brand-deep flex items-center justify-center text-white font-bold">
                {(prefs.name?.[0] ?? 'P').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold truncate">{prefs.name || 'Pulse user'}</div>
                <div className="text-[11px] text-ink-300">Whitefield, Bengaluru</div>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center" aria-label="Close panel">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-2 py-2 border-b border-line">
              <div className="grid grid-cols-4 gap-1">
                {([
                  { id: 'profile', label: 'Profile', icon: User },
                  { id: 'preferences', label: 'Prefs', icon: Sparkles },
                  { id: 'settings', label: 'Settings', icon: Settings },
                  { id: 'privacy', label: 'Privacy', icon: ShieldCheck }
                ] as const).map((t) => {
                  const Icon = t.icon;
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`py-2 rounded-lg text-[12px] flex flex-col items-center gap-0.5 transition ${active ? 'bg-muted text-brand-amber font-semibold' : 'text-ink-300 hover:bg-muted/60'}`}
                    >
                      <Icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {tab === 'profile' && <ProfileTab prefs={prefs} orders={orders} clearOrders={clearOrders} onClose={onClose} />}
              {tab === 'preferences' && <PreferencesTab prefs={prefs} onClose={onClose} />}
              {tab === 'settings' && <SettingsTab prefs={prefs} update={update} />}
              {tab === 'privacy' && <PrivacyTab reset={reset} update={update} prefs={prefs} clearOrders={clearOrders} />}
            </div>

            <div className="border-t border-line p-3 flex items-center justify-between">
              <Link href="/dashboard" onClick={onClose} className="text-[12px] text-ink-300 hover:text-ink-100 inline-flex items-center gap-1">
                <BarChart3 className="w-3.5 h-3.5" /> Architecture
              </Link>
              <Link href="/pitch" onClick={onClose} className="text-[12px] text-ink-300 hover:text-ink-100 inline-flex items-center gap-1">
                <Presentation className="w-3.5 h-3.5" /> Pitch deck
              </Link>
              <button onClick={onClose} className="text-[12px] text-bad inline-flex items-center gap-1">
                <LogOut className="w-3.5 h-3.5" /> Sign out (mock)
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ProfileTab({ prefs, orders, clearOrders, onClose }: { prefs: UserPreferences; orders: any[]; clearOrders: () => void; onClose: () => void }) {
  const recent = orders.slice(0, 5);
  return (
    <div className="space-y-3">
      <Row icon={<MapPin className="w-4 h-4" />} title="Default address" sub="Flat 402, Brigade Cosmopolis, Whitefield, 560066" />
      <Row icon={<CreditCard className="w-4 h-4" />} title="Payment" sub="Amazon Pay UPI · priya@apl" />

      <div className="surface-soft p-3.5">
        <div className="flex items-center justify-between mb-2">
          <div className="h-eyebrow flex items-center gap-1.5"><ShoppingBag className="w-3.5 h-3.5" /> Orders</div>
          {orders.length > 0 && (
            <button onClick={() => { if (confirm('Clear order history from this device?')) clearOrders(); }} className="text-[11px] text-bad">
              Clear
            </button>
          )}
        </div>
        {recent.length === 0 ? (
          <div className="text-[12px] text-ink-300">No orders yet. Build a cart and hold to confirm.</div>
        ) : (
          <ul className="space-y-2">
            {recent.map((o) => (
              <li key={o.id} className="flex items-start gap-2 text-[13px]">
                <div className={`w-7 h-7 rounded-lg ${o.status === 'undone' ? 'bg-bad/15 text-bad' : 'bg-good/15 text-good'} border ${o.status === 'undone' ? 'border-bad/30' : 'border-good/30'} flex items-center justify-center text-[10px] font-bold uppercase tracking-wider mt-0.5`}>
                  {o.status === 'undone' ? 'Und' : 'OK'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{o.label}</div>
                  <div className="text-[11px] text-ink-300 flex items-center gap-2">
                    <span><Clock className="inline w-3 h-3 mr-0.5" />{new Date(o.placed_at).toLocaleString()}</span>
                    <span>· {o.items.length} item{o.items.length === 1 ? '' : 's'}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold">{inr(o.total)}</div>
                  <div className="text-[10px] text-ink-300">{o.eta_minutes}m ETA</div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {orders.length > recent.length && (
          <div className="text-[11px] text-ink-400 mt-2">Showing {recent.length} of {orders.length} orders.</div>
        )}
      </div>

      <div className="surface-soft p-3.5">
        <div className="h-eyebrow mb-1.5">Household</div>
        {prefs.household.length ? (
          <div className="flex flex-wrap gap-1.5">
            {prefs.household.map((h) => <span key={h} className="pill-soft">{h.replace(/-/g, ' ')}</span>)}
          </div>
        ) : (
          <div className="text-[12px] text-ink-300">Not set yet. Edit in Preferences.</div>
        )}
      </div>

      <Link href="/onboarding" onClick={onClose} className="btn-dark w-full">
        Re-run onboarding
      </Link>
    </div>
  );
}

function PreferencesTab({ prefs, onClose }: { prefs: UserPreferences; onClose: () => void }) {
  return (
    <div className="space-y-3">
      <Group title="Diet">
        {prefs.dietary.length ? prefs.dietary.map((d) => <span key={d} className="pill-orange">{d}</span>) : <Empty />}
      </Group>
      <Group title="Health notes">
        {prefs.healthCautions.length ? prefs.healthCautions.map((h) => <span key={h} className="pill-soft">{h.replace(/-/g, ' ')}</span>) : <Empty />}
      </Group>
      <Group title="Interests">
        {prefs.interests.length ? prefs.interests.map((i) => <span key={i} className="pill-soft">{i.replace(/-/g, ' ')}</span>) : <Empty />}
      </Group>
      <Group title="Brand preferences">
        {Object.entries(prefs.brandPreferences ?? {}).filter(([k]) => k !== 'meta').flatMap(([cat, list]) =>
          (list as string[]).map((b) => <span key={`${cat}-${b}`} className="pill-soft">{b}</span>)
        )}
      </Group>
      <Link href="/onboarding" onClick={onClose} className="btn-primary w-full">
        Edit preferences
      </Link>
    </div>
  );
}

function SettingsTab({ prefs, update }: { prefs: UserPreferences; update: any }) {
  return (
    <div className="space-y-3">
      <ThemeToggle prefs={prefs} update={update} />
      <ToggleRow icon={<Sparkles className="w-4 h-4" />} title="Personalization" sub="Use my preferences to rank products" on={prefs.personalizationEnabled} onChange={(v) => update({ personalizationEnabled: v })} />
      <ToggleRow icon={<Bell className="w-4 h-4" />} title="Predictive reorder reminders" sub="Notify me before I run out" on={prefs.predictionsEnabled} onChange={(v) => update({ predictionsEnabled: v })} />
      <ToggleRow icon={<Mic className="w-4 h-4" />} title="Voice input" sub="Microphone permission required" on={prefs.voiceEnabled} onChange={(v) => update({ voiceEnabled: v })} />
      <ToggleRow icon={<Camera className="w-4 h-4" />} title="Camera & photo scan" sub="Camera permission required" on={prefs.cameraEnabled} onChange={(v) => update({ cameraEnabled: v })} />
      <SelectRow icon={<Globe className="w-4 h-4" />} title="Language" value={prefs.language} options={[{ value: 'english', label: 'English' }, { value: 'hinglish', label: 'Hinglish' }, { value: 'hindi', label: 'Hindi' }]} onChange={(v) => update({ language: v })} />
      <SelectRow icon={<CreditCard className="w-4 h-4" />} title="Default payment" value={prefs.paymentPreference} options={[{ value: 'amazon_pay_upi', label: 'Amazon Pay UPI' }, { value: 'card', label: 'Saved card' }, { value: 'cod', label: 'Cash on delivery' }]} onChange={(v) => update({ paymentPreference: v })} />
      <AIDiagnostics />
    </div>
  );
}

function AIDiagnostics() {
  const status = useAIStatus();
  const dot =
    !status ? 'bg-ink-400' :
    status.bedrock_enabled && !status.config_error ? 'bg-good' :
    'bg-warn';
  const stateLabel =
    !status ? 'Checking…' :
    status.bedrock_enabled && !status.config_error ? 'Live' :
    status.mock_allowed ? 'Mock fallback' :
    'Unavailable';
  const modelLabel = status?.model ? humanModel(status.model) : '—';

  return (
    <div className="surface-soft p-3.5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-muted border border-line text-brand-amber flex items-center justify-center">
          <Cpu className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold flex items-center gap-1.5">
            AI engine
            <span className={`inline-block w-2 h-2 rounded-full ${dot}`} />
            <span className="text-[11px] text-ink-300 font-normal">{stateLabel}</span>
          </div>
          <div className="text-[11px] text-ink-300 truncate">Model: <span className="text-ink-200">{modelLabel}</span></div>
        </div>
      </div>
      {status?.config_error && (
        <div className="mt-2 text-[11px] text-warn">{status.config_error}</div>
      )}
      <div className="mt-2 text-[10px] text-ink-400">
        Diagnostics only. Hidden from customer-facing screens.
      </div>
    </div>
  );
}

function humanModel(m: string) {
  if (m.includes('nova-micro')) return 'Amazon Nova Micro';
  if (m.includes('nova-lite')) return 'Amazon Nova Lite';
  if (m.includes('nova-pro')) return 'Amazon Nova Pro';
  if (m.includes('claude-3-5-haiku')) return 'Claude 3.5 Haiku';
  if (m.includes('claude-3-haiku')) return 'Claude 3 Haiku';
  if (m.includes('claude-3-5-sonnet')) return 'Claude 3.5 Sonnet';
  if (m.includes('claude-sonnet-4-5')) return 'Claude Sonnet 4.5';
  return m;
}

function ThemeToggle({ prefs, update }: { prefs: UserPreferences; update: any }) {
  return (
    <div className="surface-soft p-3.5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-muted border border-line text-brand-amber flex items-center justify-center">
          {prefs.theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-semibold">Appearance</div>
          <div className="text-[11px] text-ink-300">{prefs.theme === 'dark' ? 'Dark theme' : 'Light theme (default)'}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => update({ theme: 'light' })}
          className={`py-2 rounded-lg text-[13px] inline-flex items-center justify-center gap-1.5 border transition ${prefs.theme === 'light' ? 'bg-brand-orange/10 border-brand-orange/40 text-brand-amber font-semibold' : 'bg-surface border-line text-ink-200 hover:bg-muted'}`}
        >
          <Sun className="w-4 h-4" /> Light
        </button>
        <button
          onClick={() => update({ theme: 'dark' })}
          className={`py-2 rounded-lg text-[13px] inline-flex items-center justify-center gap-1.5 border transition ${prefs.theme === 'dark' ? 'bg-brand-orange/10 border-brand-orange/40 text-brand-amber font-semibold' : 'bg-surface border-line text-ink-200 hover:bg-muted'}`}
        >
          <Moon className="w-4 h-4" /> Dark
        </button>
      </div>
    </div>
  );
}

function PrivacyTab({ prefs, update, reset, clearOrders }: { prefs: UserPreferences; update: any; reset: () => void; clearOrders: () => void }) {
  return (
    <div className="space-y-3">
      <div className="surface-soft p-4 text-[13px] text-ink-200 leading-relaxed">
        Pulse uses your saved preferences only to filter and rank products. Health notes are never used as medical advice. Camera and microphone are used only after permission and only when you tap them.
      </div>
      <ToggleRow icon={<Sparkles className="w-4 h-4" />} title="Use preferences for AI grounding" sub="When off, your preferences are not passed to the AI." on={prefs.personalizationEnabled} onChange={(v) => update({ personalizationEnabled: v })} />
      <button
        onClick={() => { if (confirm('Delete all saved preferences from this device?')) reset(); }}
        className="w-full surface-soft p-3.5 text-bad text-left flex items-center gap-2 hover:bg-bad/10"
      >
        <Trash2 className="w-4 h-4" />
        <span className="text-[13px] font-medium">Delete all preferences from this device</span>
      </button>
      <button
        onClick={() => { if (confirm('Clear order history from this device?')) clearOrders(); }}
        className="w-full surface-soft p-3.5 text-bad text-left flex items-center gap-2 hover:bg-bad/10"
      >
        <Trash2 className="w-4 h-4" />
        <span className="text-[13px] font-medium">Clear order history</span>
      </button>
    </div>
  );
}

function Row({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <button className="w-full surface-soft p-3.5 flex items-center gap-3 hover:bg-muted text-left transition">
      <div className="w-9 h-9 rounded-lg bg-muted border border-line text-brand-amber flex items-center justify-center">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold">{title}</div>
        <div className="text-[11px] text-ink-300 truncate">{sub}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-ink-400" />
    </button>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface-soft p-3.5">
      <div className="h-eyebrow mb-2">{title}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Empty() { return <span className="text-[12px] text-ink-300">Not set</span>; }

function ToggleRow({ icon, title, sub, on, onChange }: { icon: React.ReactNode; title: string; sub: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="surface-soft p-3.5 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-muted border border-line text-brand-amber flex items-center justify-center">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold">{title}</div>
        <div className="text-[11px] text-ink-300">{sub}</div>
      </div>
      <button
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={`relative w-11 h-6 rounded-full transition ${on ? 'bg-brand-orange' : 'bg-muted border border-line'}`}
      >
        <span className={`absolute top-0.5 ${on ? 'left-[22px]' : 'left-0.5'} w-5 h-5 rounded-full bg-white transition`} />
      </button>
    </div>
  );
}

function SelectRow({ icon, title, value, options, onChange }: { icon: React.ReactNode; title: string; value: string; options: { value: string; label: string }[]; onChange: (v: any) => void }) {
  return (
    <div className="surface-soft p-3.5 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-muted border border-line text-brand-amber flex items-center justify-center">{icon}</div>
      <div className="flex-1">
        <div className="text-[13px] font-semibold">{title}</div>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-surface border border-line text-[13px] rounded-lg px-2 py-1.5 outline-none"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
