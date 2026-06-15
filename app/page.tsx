'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Siren, Sparkles, Camera, FileText, MapPin, ChevronRight, Mic,
  Zap, ShieldCheck, Trophy, Repeat, MessageSquareDashed, Headphones, Calendar,
  Upload, Bell, ShoppingBag, ScanLine
} from 'lucide-react';
import { PredictionCard } from '@/components/PredictionCard';
import { VoiceInput } from '@/components/VoiceInput';
import { useUserPreferences } from '@/lib/userPreferences';
import { useScheduledOrders } from '@/lib/scheduledOrders';
import type { Reminder } from '@/lib/types';
import categoryVisuals from '@/data/categoryVisuals.json';

const QUICK_INTENTS = [
  { label: 'Make poha', q: 'I want to make poha', icon: '🍚' },
  { label: 'Guests coming', q: 'Guests arriving in 20 minutes', icon: '🎉' },
  { label: 'Period care', q: 'Period care kit', icon: '🌸' },
  { label: 'Make biryani', q: 'I want to make chicken biryani for 4', icon: '🍛' },
  { label: 'Vegan snacks', q: 'I need vegan snacks', icon: '🌱' },
  { label: 'Fever care', q: 'fever care kit', icon: '🌡️' }
];

const EMERGENCY_CARDS = [
  { id: 'guests_arriving', label: 'Guests in 20 min', icon: '🎉', sub: '8 min' },
  { id: 'period_care', label: 'Period care', icon: '🌸', sub: '9 min' },
  { id: 'fever', label: 'Fever care', icon: '🌡️', sub: '12 min' },
  { id: 'rainy_day', label: 'Rainy day', icon: '☔', sub: '14 min' },
  { id: 'pooja', label: 'Pooja', icon: '🪔', sub: '18 min' },
  { id: 'power_cut', label: 'Power cut', icon: '🔌', sub: '22 min' },
  { id: 'cooking', label: 'Cooking emergency', icon: '🍳', sub: '12 min' },
  { id: 'travel', label: 'Travel packing', icon: '🧳', sub: '15 min' }
];

const GUIDED_CARDS = [
  { id: 'new_parent', label: 'New parent starter', icon: '👶' },
  { id: 'new_flat', label: 'New flat setup', icon: '🏠' },
  { id: 'weekly_groceries', label: 'Weekly groceries', icon: '🛒' },
  { id: 'high_protein', label: 'Healthy breakfast', icon: '🥣' },
  { id: 'vegan_pantry', label: 'Vegan pantry', icon: '🌱' },
  { id: 'skincare', label: 'Skincare starter', icon: '💄' },
  { id: 'movie_night', label: 'Movie night', icon: '🍿' },
  { id: 'fitness_box', label: 'Fitness snack box', icon: '💪' }
];

const COMBOS = [
  { id: 'guest_combo', label: 'Guest snack combo', icon: '🎉', save: 67 },
  { id: 'cleaning_combo', label: 'Cleaning combo', icon: '🧽', save: 92 },
  { id: 'breakfast_combo', label: 'Breakfast combo', icon: '🥣', save: 60 },
  { id: 'baby_combo', label: 'Baby care combo', icon: '🍼', save: 110 },
  { id: 'pooja_combo', label: 'Pooja combo', icon: '🪔', save: 75 }
];

function HomeInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { prefs } = useUserPreferences();
  const { schedules } = useScheduledOrders();
  const [text, setText] = useState('');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [welcome, setWelcome] = useState<null | 'done' | 'skipped' | 'undone'>(null);

  useEffect(() => {
    fetch('/api/predict-reorder').then((r) => r.json()).then((j) => setReminders(j.reminders ?? []));
    if (params.get('welcome') === '1') setWelcome('done');
    else if (params.get('welcome') === 'skipped') setWelcome('skipped');
    else if (params.get('undone') === '1') setWelcome('undone');
    if (welcome) setTimeout(() => setWelcome(null), 4500);
    // eslint-disable-next-line
  }, [params]);

  const submit = (q?: string) => {
    const value = (q ?? text).trim();
    if (!value) return;
    router.push(`/intent?q=${encodeURIComponent(value)}`);
  };

  return (
    <div className="space-y-7 pt-4 md:pt-6 pb-12">
      {/* HERO */}
      <Hero name={prefs.name} />

      {/* Toast strip */}
      <AnimatePresence>
        {welcome && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`surface-soft p-3 text-[13px] flex items-center gap-2 ${welcome === 'undone' ? 'text-bad' : 'text-good'}`}
          >
            <Sparkles className="w-4 h-4" />
            {welcome === 'done' && 'Preferences saved. Pulse is personalised for you.'}
            {welcome === 'skipped' && 'Onboarding skipped — you can personalise from Settings any time.'}
            {welcome === 'undone' && 'Order cancelled. Cart is back to where you left off.'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* DELIVERY STRIP */}
      <DeliveryStrip />

      {/* Greeting + search */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[12px] text-ink-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Whitefield, Bengaluru
            </div>
            <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight mt-0.5">
              {prefs.name ? `Hi ${prefs.name},` : 'Hi there,'} <span className="text-ink-300 font-normal">what do you need?</span>
            </h2>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-2 mt-3 flex items-center gap-2"
        >
          <Search className="w-5 h-5 text-ink-300 ml-2 shrink-0" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Try: poha for 2 or movie night for 6"
            className="flex-1 bg-transparent outline-none py-3 text-[15px] placeholder:text-ink-400"
          />
          <VoiceInput compact onTranscript={(t) => submit(t)} ariaLabel="Voice search" />
          <Link
            href="/upload?mode=product"
            aria-label="Camera search"
            title="Search by photo"
            className="w-10 h-10 rounded-xl border border-line bg-surface hover:border-brand-orange/40 hover:bg-muted inline-flex items-center justify-center transition"
          >
            <Camera className="w-5 h-5 text-ink-200" />
          </Link>
        </motion.div>

        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
          {QUICK_INTENTS.map((q) => (
            <motion.button
              key={q.q}
              whileHover={{ y: -2 }}
              onClick={() => submit(q.q)}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-line text-[13px] hover:border-brand-orange/30 hover:text-brand-amber transition"
            >
              <span>{q.icon}</span>
              {q.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <Section eyebrow="Quick actions" title="Give Pulse anything — photo, list, packet, voice">
        <div className="grid grid-cols-3 md:grid-cols-7 gap-2.5">
          <QuickAction href="/voice-order" icon="🎙️" label="Voice order" />
          <QuickAction href="/upload?mode=list" icon="📝" label="Upload list" />
          <QuickAction href="/upload?mode=voice" icon="🎧" label="Voice note" />
          <QuickAction href="/upload?mode=product" icon="📷" label="Camera scan" />
          <QuickAction href="/upload?mode=product" icon="📦" label="Empty packet" />
          <QuickAction href="/emergency" icon="🚨" label="Emergency" />
          <QuickAction href="/scheduled-orders" icon="🗓️" label="Schedule" />
        </div>
      </Section>

      {/* SHOP BY CATEGORY */}
      <Section eyebrow="Shop by category" title="A whole quick-commerce store inside Pulse">
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2.5">
          {(categoryVisuals as any[]).map((c) => (
            <Link
              key={c.id}
              href={`/intent?q=${encodeURIComponent(c.label)}`}
              className="card-glow p-3 text-center hover:-translate-y-0.5 transition"
            >
              <div className="text-3xl">{c.icon}</div>
              <div className="text-[12px] font-semibold mt-1.5 leading-tight">{c.label}</div>
              <div className="mt-1 flex items-center justify-center gap-1">
                <span className="pill-soft text-[10px]">{c.eta}</span>
                {c.badge && <span className="pill-orange text-[10px]">{c.badge}</span>}
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* PERSONALISED FOR YOU */}
      <Section eyebrow="Personalised for you" title={prefs.personalizationEnabled ? 'Tuned to your preferences' : 'Personalisation is off — turn it on in Settings'}>
        <div className="grid grid-cols-2 gap-3">
          <Tile href="/intent?q=Reorder+my+usual+milk" icon="🥛" label="Reorder usual milk" sub="Amul Taaza · 8 min" tone="amber" />
          <Tile href="/emergency?id=guests_arriving" icon="🎉" label="Guest snack kit" sub="Auto-built for 4" tone="orange" />
          <Tile href="/upload?mode=product" icon="📷" label="Scan empty packet" sub="Photo to reorder" tone="blue" />
          <Tile href="/guided" icon="🤝" label="Guided shopping" sub="AI asks. You confirm." tone="violet" />
        </div>
      </Section>

      {/* PREDICTED FOR YOU */}
      {reminders.length > 0 && prefs.predictionsEnabled && (
        <Section eyebrow="Predicted for you" title="Likely running out" rightHint="from your order history">
          <div className="space-y-2">
            {reminders.slice(0, 3).map((r) => <PredictionCard key={r.id} reminder={r} />)}
          </div>
        </Section>
      )}

      {/* EMERGENCY KITS */}
      <Section eyebrow="Emergency kits" title="One-hold rescue carts">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {EMERGENCY_CARDS.map((e) => (
            <Link key={e.id} href={`/emergency?id=${e.id}`} className="card-glow p-3 text-center hover:-translate-y-0.5 transition">
              <div className="text-2xl">{e.icon}</div>
              <div className="text-[12px] font-semibold mt-1.5">{e.label}</div>
              <div className="text-[10px] text-ink-300">{e.sub}</div>
            </Link>
          ))}
        </div>
      </Section>

      {/* GUIDED JOURNEYS */}
      <Section eyebrow="Guided journeys" title="When you know the goal, not the SKU">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {GUIDED_CARDS.map((g) => (
            <Link key={g.id} href={`/guided?id=${g.id}`} className="card-glow p-3 text-center hover:-translate-y-0.5 transition">
              <div className="text-2xl">{g.icon}</div>
              <div className="text-[12px] font-semibold mt-1.5">{g.label}</div>
            </Link>
          ))}
        </div>
      </Section>

      {/* UPLOAD AND SCAN */}
      <Section eyebrow="Pulse Upload" title="Snap, paste or speak — Pulse builds the cart">
        <div className="grid md:grid-cols-2 gap-3">
          <UploadTile href="/upload?mode=list" title="Handwritten list to cart" sub="Snap a paper list, AI reads each line" icon={<FileText className="w-5 h-5" />} />
          <UploadTile href="/upload?mode=product" title="Empty packet to reorder" sub="Photo of an empty packet → reorder" icon={<Camera className="w-5 h-5" />} />
          <UploadTile href="/upload?mode=product" title="Product photo match" sub="Recognise any pack, find the SKU" icon={<ScanLine className="w-5 h-5" />} />
          <UploadTile href="/upload?mode=voice" title="Voice note to cart" sub="Drop a WhatsApp voice note, get a cart" icon={<Headphones className="w-5 h-5" />} />
        </div>
      </Section>

      {/* SCHEDULED ORDERS */}
      <Section eyebrow="Scheduled orders" title="Never forget daily essentials" rightHint={`${schedules.filter((s) => s.status === 'active').length} active`}>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-orange/15 border border-brand-orange/30 text-brand-amber flex items-center justify-center text-2xl">🗓️</div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[14px]">Auto-reorder schedule</div>
            <div className="text-[12px] text-ink-300 mt-0.5">
              Examples: milk alternate days at 5 PM · curd every morning · diapers every 7 days · pooja flowers every Sunday.
            </div>
            <div className="text-[11px] text-ink-400 mt-1">We always confirm before placing.</div>
          </div>
          <Link href="/scheduled-orders" className="btn-primary py-2 px-3 text-[12px]">
            <Calendar className="w-4 h-4" /> Open
          </Link>
        </div>
        {schedules.length > 0 && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
            {schedules.slice(0, 4).map((s) => (
              <Link key={s.id} href="/scheduled-orders" className="surface-soft p-3 flex items-center gap-2 hover:bg-muted">
                <div className="text-xl">🗓️</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium truncate">{s.label}</div>
                  <div className="text-[10px] text-ink-300">Next: {new Date(s.nextRunAt).toLocaleString()}</div>
                </div>
                <span className={`pill ${s.status === 'active' ? 'pill-good' : 'pill-soft'}`}>{s.status}</span>
              </Link>
            ))}
          </div>
        )}
      </Section>

      {/* SMART COMBOS */}
      <Section eyebrow="Smart combos" title="Curated bundles, lower per-unit cost">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
          {COMBOS.map((c) => (
            <Link key={c.id} href={`/emergency?id=guests_arriving`} className="card-glow p-3 text-center hover:-translate-y-0.5 transition">
              <div className="text-2xl">{c.icon}</div>
              <div className="text-[12px] font-semibold mt-1.5">{c.label}</div>
              <div className="text-[10px] text-good mt-1">save ₹{c.save}</div>
            </Link>
          ))}
        </div>
      </Section>

      {/* WHY PULSE NOW */}
      <Section eyebrow="Why Pulse Now" title="Built around how you actually shop">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat icon={<Trophy className="w-4 h-4" />} k="Decision time" v="5 min → 7 sec" />
          <Stat icon={<Zap className="w-4 h-4" />} k="Taps" v="8 → 1 hold" />
          <Stat icon={<Repeat className="w-4 h-4" />} k="Choices to scan" v="50 → 3 cards" />
          <Stat icon={<ShieldCheck className="w-4 h-4" />} k="Stock-safe" v="Catalog grounded" />
        </div>
      </Section>

      {/* TRUST */}
      <Section eyebrow="Privacy & trust" title="You stay in control">
        <div className="grid md:grid-cols-2 gap-3">
          <Trust title="No hallucinated products" sub="AI only adds in-stock catalog items. Anything else shows as 'not in catalog'." />
          <Trust title="No order without confirm" sub="Hold to pay. 5-second undo (10s if order > ₹500, with Confirm now)." />
          <Trust title="Camera & mic on permission only" sub="We ask the moment you tap, never before." />
          <Trust title="User-controlled personalization" sub="Edit or delete saved preferences any time from Settings." />
        </div>
      </Section>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}

function Hero({ name }: { name?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-line bg-elevated"
    >
      <motion.div aria-hidden className="absolute -right-24 -top-24 w-80 h-80 rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle at center, rgb(var(--brand-orange)), transparent 70%)' }}
        animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div aria-hidden className="absolute -left-12 -bottom-16 w-72 h-72 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle at center, rgb(var(--info)), transparent 70%)' }}
        animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }} />

      <div className="relative p-5 md:p-7 flex items-center gap-4">
        <div className="shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-2xl overflow-hidden ring-1 ring-line bg-muted relative">
          <Image src="/logo.png" alt="Pulse Now" fill sizes="64px" className="object-cover" priority />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] uppercase tracking-[0.18em] text-ink-300 font-semibold">Amazon Pulse Now</span>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1 leading-tight">
            From <span className="gradient-text">need</span> to done — in seconds.
          </h1>
          <p className="text-[13px] text-ink-300 mt-1.5 hidden md:block">
            Personalised · Stock-aware · Voice-first · Catalog-grounded
          </p>
        </div>
      </div>

      <div className="relative px-5 md:px-7 py-2.5 bg-black/10 dark:bg-black/30 border-t border-line flex items-center gap-3 text-[11px] text-ink-300 overflow-x-auto no-scrollbar">
        <span className="inline-flex items-center gap-1 shrink-0"><Zap className="w-3 h-3 text-brand-amber" /> Fastest in 8 min</span>
        <span className="text-ink-500">·</span>
        <span className="shrink-0">India-first · Hinglish</span>
        <span className="text-ink-500">·</span>
        <span className="shrink-0">Stock-aware</span>
        <span className="text-ink-500">·</span>
        <span className="inline-flex items-center gap-1 shrink-0"><ShieldCheck className="w-3 h-3 text-good" /> Safe undo on every order</span>
      </div>
    </motion.section>
  );
}

function DeliveryStrip() {
  return (
    <div className="surface-soft p-3 flex items-center gap-3 text-[12px]">
      <div className="w-8 h-8 rounded-lg bg-brand-orange/15 text-brand-amber border border-brand-orange/30 flex items-center justify-center"><MapPin className="w-4 h-4" /></div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-ink-100">Delivering to Whitefield · Brigade Cosmopolis</div>
        <div className="text-ink-300 truncate">Dark store: Whitefield 01 · ETA 8–12 min</div>
      </div>
      <button className="text-brand-blue text-[12px] font-semibold">Change</button>
    </div>
  );
}

function Section({ eyebrow, title, rightHint, children }: { eyebrow: string; title: string; rightHint?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-end justify-between mb-3">
        <div>
          <div className="h-eyebrow text-brand-amber">{eyebrow}</div>
          <h2 className="text-[18px] md:text-[20px] font-semibold tracking-tight mt-0.5">{title}</h2>
        </div>
        {rightHint && <div className="text-[11px] text-ink-400">{rightHint}</div>}
      </div>
      {children}
    </section>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href} className="card p-3 text-center hover:-translate-y-0.5 transition">
      <div className="text-2xl">{icon}</div>
      <div className="text-[11px] font-semibold mt-1.5 leading-tight">{label}</div>
    </Link>
  );
}

function Tile({ href, icon, label, sub, tone }: { href: string; icon: string; label: string; sub: string; tone: 'orange' | 'amber' | 'blue' | 'violet' }) {
  const tones: Record<string, string> = {
    orange: 'from-brand-orange/15 to-brand-orange/0 border-brand-orange/25',
    amber: 'from-amber-500/15 to-amber-500/0 border-amber-500/25',
    blue: 'from-blue-500/15 to-blue-500/0 border-blue-500/25',
    violet: 'from-violet-500/15 to-violet-500/0 border-violet-500/25'
  };
  return (
    <motion.div whileHover={{ y: -2 }}>
      <Link href={href} className="card p-4 flex items-start gap-3 hover:shadow-glow transition">
        <div className={`w-11 h-11 rounded-xl border bg-gradient-to-br flex items-center justify-center text-2xl ${tones[tone]}`}>{icon}</div>
        <div className="min-w-0">
          <div className="font-semibold text-[14px]">{label}</div>
          <div className="text-[11px] text-ink-300 mt-0.5">{sub}</div>
        </div>
      </Link>
    </motion.div>
  );
}

function UploadTile({ href, title, sub, icon }: { href: string; title: string; sub: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="card-glow p-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-muted border border-line text-brand-amber flex items-center justify-center">{icon}</div>
      <div className="min-w-0">
        <div className="font-semibold text-[14px]">{title}</div>
        <div className="text-[11px] text-ink-300 mt-0.5">{sub}</div>
      </div>
    </Link>
  );
}

function Stat({ icon, k, v }: { icon: React.ReactNode; k: string; v: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-1.5 text-brand-amber">{icon}<span className="text-[11px] uppercase tracking-wider font-semibold">{k}</span></div>
      <div className="font-semibold text-[16px] mt-1">{v}</div>
    </div>
  );
}

function Trust({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="surface-soft p-4">
      <div className="flex items-center gap-1.5 text-good"><ShieldCheck className="w-4 h-4" /><span className="text-[13px] font-semibold">{title}</span></div>
      <div className="text-[12px] text-ink-300 mt-1">{sub}</div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="card p-4 text-[12px] text-ink-300">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Pulse" width={20} height={20} className="rounded" />
          <span className="font-semibold text-ink-100">Amazon Pulse Now</span>
          <span className="pill-soft">HackOn 6.0</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="hover:text-ink-100">Architecture</Link>
          <Link href="/pitch" className="hover:text-ink-100">Pitch</Link>
          <Link href="/scheduled-orders" className="hover:text-ink-100">Schedules</Link>
        </div>
      </div>
      <div className="mt-2 text-[11px] text-ink-400">
        Stock-aware · Catalog-grounded · Mobile-first · India-first
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="pt-10 text-ink-300">Loading…</div>}>
      <HomeInner />
    </Suspense>
  );
}
