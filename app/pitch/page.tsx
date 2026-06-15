'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Sparkles, Zap, Brain, Camera, FileText, Mic, ShieldCheck, ArrowRight,
  Hand, Compass, ShoppingCart, TrendingUp, Cpu, Building2, CalendarRange
} from 'lucide-react';
import demoScenariosRaw from '@/data/demoScenarios.json';

const SCENARIOS = demoScenariosRaw as any[];

export default function PitchPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink-900">
      <div className="max-w-6xl mx-auto px-5 md:px-10 py-10 space-y-16">
        <Header />
        <Problem />
        <Solution />
        <BeforeAfter />
        <Pillars />
        <Scenarios />
        <Architecture />
        <Business />
        <Roadmap />
        <Closing />
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="relative inline-flex w-9 h-9 rounded-lg overflow-hidden ring-1 ring-line bg-white">
            <Image src="/logo.png" alt="Pulse Now" fill sizes="36px" className="object-cover" priority />
          </span>
          <div className="leading-tight">
            <div className="text-[10px] uppercase tracking-[0.16em] text-ink-500 font-semibold">amazon</div>
            <div className="font-semibold">Pulse Now</div>
          </div>
        </Link>
        <Link href="/" className="btn-ghost text-sm">Open prototype <ArrowRight className="w-4 h-4" /></Link>
      </div>
      <div className="text-[11px] uppercase tracking-wider text-brand-orange font-semibold flex items-center gap-1">
        <Sparkles className="w-3 h-3" /> Amazon HackOn 6.0 · Reimagining Urgent Shopping
      </div>
      <h1 className="text-4xl md:text-6xl font-semibold leading-[1.05] tracking-tight">
        From <span className="text-brand-orange">need</span> to done — in seconds.
      </h1>
      <p className="text-ink-500 text-lg max-w-3xl">
        Delivery is fast. Shopping isn't. <span className="text-ink-900 font-medium">Amazon Pulse Now</span> makes the shopping disappear — an India-first ambient AI assistant inside Amazon Now that turns intent into a confident cart in one hold.
      </p>
    </header>
  );
}

function Problem() {
  const pains = [
    'Search 50 SKUs to find one match',
    'Manually compare ratings & price',
    'Build cart item by item',
    'Know the goal, not the SKU',
    'Need fastest option, not best browse',
    'Want trusted picks when unsure',
    'Repeat purchases need re-doing',
    'Paper lists & empty packets stay offline',
    'Urgent moments — guests, period, fever, pooja, power-cut'
  ];
  return (
    <section className="card p-6 md:p-8">
      <SectionHeader icon={<Zap className="w-4 h-4" />} kicker="Problem" title="9 customer pains in urgent shopping" />
      <div className="grid md:grid-cols-3 gap-3 mt-4">
        {pains.map((p) => (
          <div key={p} className="surface-soft p-4 text-[14px] text-ink-700">{p}</div>
        ))}
      </div>
      <p className="text-ink-500 text-[14px] mt-4 max-w-3xl">
        Most teams will build a faster search. We removed search.
      </p>
    </section>
  );
}

function Solution() {
  return (
    <section className="grid md:grid-cols-2 gap-6 items-center">
      <div className="space-y-4">
        <SectionHeader icon={<Sparkles className="w-4 h-4" />} kicker="Solution" title="Express the need. See 3 cards. Hold to confirm." />
        <p className="text-ink-700 leading-relaxed text-[15px]">
          Pulse Now reads intent, voice, photo, handwritten lists, previous orders, household memory and emergency context. It returns three confidence-ranked SmartCards: <em>Fastest, Best Match, Trusted Repeat</em>, plus a Smart Combo bundle. Every card is explainable. Every order has a 5-second undo.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Pill icon={<Mic className="w-4 h-4" />} label="Hinglish voice" />
          <Pill icon={<Camera className="w-4 h-4" />} label="Photo reorder" />
          <Pill icon={<FileText className="w-4 h-4" />} label="Handwritten list" />
          <Pill icon={<Hand className="w-4 h-4" />} label="OneConfirm hold" />
          <Pill icon={<ShieldCheck className="w-4 h-4" />} label="Privacy-first" />
          <Pill icon={<Compass className="w-4 h-4" />} label="Ambient surfaces" />
        </div>
      </div>
      <PhoneDemo />
    </section>
  );
}

function PhoneDemo() {
  return (
    <div className="phone-frame mx-auto w-full max-w-[320px] aspect-[9/19]">
      <div className="phone-screen p-4 space-y-3">
        <div className="text-[10px] uppercase tracking-wider text-brand-orange font-semibold flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Pulse
        </div>
        <div className="card p-3 text-[13px]">"I want to make poha for breakfast"</div>
        <div className="surface-soft p-3">
          <div className="text-[10px] text-ink-500 uppercase tracking-wider font-semibold">Recipe Kit</div>
          <div className="font-semibold text-[13px]">Poha breakfast · 11 ingredients</div>
          <div className="text-[10px] text-ink-500">Arrives in 13 min · ₹420</div>
        </div>
        <div className="surface-soft p-3">
          <div className="text-[10px] text-ink-500 uppercase tracking-wider font-semibold">Fastest</div>
          <div className="font-semibold text-[13px]">MDH Poha 500g</div>
          <div className="text-[10px] text-ink-500">Arrives in 10 min · ₹65</div>
        </div>
        <div className="rounded-xl bg-brand-orange text-ink-900 text-[13px] font-semibold py-3 text-center">
          Hold to confirm
        </div>
      </div>
    </div>
  );
}

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="surface-soft p-3 flex items-center gap-2 text-[14px]">
      <span className="text-brand-orange">{icon}</span>
      {label}
    </div>
  );
}

function BeforeAfter() {
  return (
    <section className="card p-6 md:p-8">
      <SectionHeader icon={<TrendingUp className="w-4 h-4" />} kicker="Before vs After" title="From minutes to seconds. From 8 taps to 1 hold." />
      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <Journey
          title="Old journey"
          tone="rose"
          steps={['Open app', 'Search "snacks"', 'Scroll 50 results', 'Compare 5 brands', 'Add to cart', 'Add cups, drinks, tissue', 'Open cart', 'Pay']}
          metric="≈ 5 min · 8 taps"
        />
        <Journey
          title="New journey"
          tone="emerald"
          steps={['Express need (voice / type / scan)', 'See 3 SmartCards', 'Hold to confirm']}
          metric="≈ 7 sec · 1 hold"
        />
      </div>
      <div className="grid md:grid-cols-3 gap-3 mt-4">
        <BigStat k="Decision time" before="5 min" after="7 sec" />
        <BigStat k="Taps" before="8" after="1 hold" />
        <BigStat k="Choices to scan" before="50 results" after="1 confident card" />
      </div>
    </section>
  );
}

function Journey({ title, steps, metric, tone }: { title: string; steps: string[]; metric: string; tone: 'rose' | 'emerald' }) {
  return (
    <div className="surface-soft p-5">
      <div className={`text-[10px] uppercase tracking-wider font-semibold ${tone === 'rose' ? 'text-bad' : 'text-good'}`}>{title}</div>
      <div className="font-semibold text-lg mt-1">{metric}</div>
      <ol className="mt-3 space-y-1.5 text-[14px] text-ink-700">
        {steps.map((s, i) => (
          <li key={s} className="flex items-start gap-2">
            <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${tone === 'rose' ? 'bg-red-100 text-bad' : 'bg-emerald-100 text-good'}`}>{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}

function BigStat({ k, before, after }: { k: string; before: string; after: string }) {
  return (
    <div className="surface-soft p-5 flex items-center gap-3">
      <div className="text-3xl font-bold text-brand-orange">→</div>
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">{k}</div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-bad line-through text-[13px]">{before}</span>
          <span className="text-good font-semibold text-lg">{after}</span>
        </div>
      </div>
    </div>
  );
}

function Pillars() {
  const items = [
    { icon: <Mic className="w-5 h-5" />, t: 'Hinglish voice', d: 'Understands "Ghar pe guests aa rahe hain, snacks bana do".' },
    { icon: <Camera className="w-5 h-5" />, t: 'Photo to cart', d: 'Empty Maggi packet → 12-pack reorder in seconds.' },
    { icon: <FileText className="w-5 h-5" />, t: 'Handwritten list', d: 'Snap a paper list, AI maps every line to your trusted SKU.' },
    { icon: <Brain className="w-5 h-5" />, t: 'Predictive reorder', d: 'Knows your milk runs out tomorrow morning.' },
    { icon: <Compass className="w-5 h-5" />, t: 'Ambient surfaces', d: 'Lock-screen, widget, voice — order without opening the app.' },
    { icon: <ShieldCheck className="w-5 h-5" />, t: 'Trust & safety', d: 'Wellness items need extra confirm. Predictions can be turned off.' }
  ];
  return (
    <section>
      <SectionHeader icon={<Sparkles className="w-4 h-4" />} kicker="Winning features" title="Eleven things you'll see in this prototype" />
      <div className="grid md:grid-cols-3 gap-3 mt-4">
        {items.map((i) => (
          <div key={i.t} className="card p-4">
            <div className="flex items-center gap-2 text-brand-orange">{i.icon}<span className="text-[14px] font-semibold text-ink-900">{i.t}</span></div>
            <div className="text-[14px] text-ink-700 mt-1">{i.d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Scenarios() {
  return (
    <section>
      <SectionHeader icon={<ShoppingCart className="w-4 h-4" />} kicker="Demo scenarios" title="Click any to run the live agent trace" />
      <div className="grid md:grid-cols-3 gap-3 mt-4">
        {SCENARIOS.map((s) => (
          <Link key={s.id} href={`/intent?q=${encodeURIComponent(s.input)}`} className="card p-4 hover:shadow-e2 transition">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{s.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[14px] leading-tight">{s.label}</div>
                <div className="text-[11px] text-ink-500 mt-0.5">{s.story}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
              <div className="surface-soft p-2 text-center">
                <div className="text-ink-500">old</div>
                <div className="font-semibold text-bad">{s.before_minutes} min</div>
              </div>
              <div className="surface-soft p-2 text-center">
                <div className="text-ink-500">new</div>
                <div className="font-semibold text-good">{s.after_seconds} sec</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Architecture() {
  return (
    <section className="card p-6 md:p-8">
      <SectionHeader icon={<Cpu className="w-4 h-4" />} kicker="Architecture" title="10 AI agents on AWS, ready for 50M households" />
      <div className="grid md:grid-cols-3 gap-4 mt-4 text-[14px]">
        <Block t="Ambient layer" items={['App Pulse Bar', 'Home-screen widget', 'Lock-screen Pinpoint notif', 'Alexa + WhatsApp imports', 'Voice + camera + list']} />
        <Block t="AI agent layer (Bedrock)" items={['Intent · Need-to-product', 'Conversational chat (live)', 'Preference · Urgency · Trust', 'Cart Builder · Explanation', 'Prediction · Vision']} />
        <Block t="Retrieval & ranking" items={['OpenSearch product index', 'Titan embeddings semantic search', 'SageMaker Personalize ranker', 'ElastiCache hot recos', 'Transparent weight formula']} />
        <Block t="Commerce backbone" items={['API Gateway + Lambda', 'DynamoDB user memory', 'Dark-store inventory adapter', 'Amazon Pay UPI checkout', 'Subscribe & Save / Fresh / Pharmacy joins']} />
        <Block t="Data + privacy" items={['S3 image uploads (KMS-encrypted)', 'EventBridge predictive triggers', 'User-controlled predictions', 'Sensitive-category guardrails', '5-second undo on every order']} />
        <Block t="Operations" items={['CloudWatch + X-Ray traces', 'A/B in SageMaker', 'CDN-cached SmartCards', 'Multi-region failover', 'Per-customer micro-stores']} />
      </div>
      <div className="mt-4">
        <Link href="/dashboard" className="btn-ghost">See live agent trace + ranking math <ArrowRight className="w-4 h-4" /></Link>
      </div>
    </section>
  );
}

function Block({ t, items }: { t: string; items: string[] }) {
  return (
    <div className="surface-soft p-4">
      <div className="text-brand-orange text-[11px] font-semibold uppercase tracking-wider">{t}</div>
      <ul className="mt-2 space-y-1 text-[13px] text-ink-700">
        {items.map((i) => (
          <li key={i} className="flex gap-2"><span className="text-brand-orange">•</span>{i}</li>
        ))}
      </ul>
    </div>
  );
}

function Business() {
  const data = [
    { k: 'Conversion uplift', v: '+34%', why: 'Decision time collapses from 5 min to 7 sec.' },
    { k: 'AOV growth', v: '+30%', why: 'Smart Combos grow basket without browsing.' },
    { k: 'Repeat order rate', v: '+23 pp', why: 'Predictive reorder + Subscribe & Save.' },
    { k: 'Cart abandonment', v: '−18 pp', why: 'No browse, no time to drop off.' },
    { k: 'Stock-out recovery', v: '+66 pp', why: 'Trust-aware substitutes save the order.' },
    { k: 'Returns / refunds', v: '−21%', why: 'Trusted SKUs + explanations set expectations.' }
  ];
  return (
    <section>
      <SectionHeader icon={<Building2 className="w-4 h-4" />} kicker="Business impact" title="Customer obsession that compounds for Amazon" />
      <div className="grid md:grid-cols-3 gap-3 mt-4">
        {data.map((d) => (
          <div key={d.k} className="card p-5">
            <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">{d.k}</div>
            <div className="text-3xl font-bold text-brand-orange mt-1">{d.v}</div>
            <div className="text-[12px] text-ink-700 mt-2">{d.why}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-[14px] text-ink-700 max-w-3xl">
        Multiplied across 50M+ Indian households: ~₹920 incremental revenue per active customer per year, sharper ETA promises, and a moat built on household memory.
      </div>
    </section>
  );
}

function Roadmap() {
  const phases = [
    { p: 'Phase 1 · Now', items: ['Pulse Bar inside Amazon Now', 'SmartCards (Fastest / Best / Trusted / Combo)', 'OneConfirm with Amazon Pay UPI', '5-second undo'] },
    { p: 'Phase 2 · 90 days', items: ['Alexa skill', 'Lock-screen + widget', 'Predictive reorder Pinpoint nudges', 'Camera & handwritten list'] },
    { p: 'Phase 3 · 6 months', items: ['Household memory profiles', 'Smart-appliance triggers', 'WhatsApp list import', 'Neighborhood demand prediction'] },
    { p: 'Phase 4 · 12 months', items: ['Approve-to-replenish ambient mode', 'Personalised micro-stores per household', 'Festival & event auto-prep', 'Public Pulse Score'] }
  ];
  return (
    <section className="card p-6 md:p-8">
      <SectionHeader icon={<CalendarRange className="w-4 h-4" />} kicker="Roadmap" title="From feature to ambient commerce platform" />
      <div className="grid md:grid-cols-4 gap-3 mt-4">
        {phases.map((ph) => (
          <div key={ph.p} className="surface-soft p-4">
            <div className="text-brand-orange text-[12px] font-semibold">{ph.p}</div>
            <ul className="mt-2 space-y-1 text-[13px] text-ink-700">
              {ph.items.map((i) => (<li key={i} className="flex gap-2"><span className="text-brand-orange">•</span>{i}</li>))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function Closing() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-10"
    >
      <div className="text-[11px] uppercase tracking-wider text-brand-orange font-semibold">Tagline</div>
      <h2 className="text-3xl md:text-5xl font-semibold mt-2 tracking-tight">
        This is not faster search. <span className="text-brand-orange">This is ambient commerce.</span>
      </h2>
      <p className="text-ink-500 mt-3">From need to done — in seconds.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/" className="btn-primary">Open the prototype</Link>
        <Link href="/dashboard" className="btn-ghost">See architecture</Link>
      </div>
    </motion.section>
  );
}

function SectionHeader({ kicker, title, icon }: { kicker: string; title: string; icon: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-brand-orange font-semibold flex items-center gap-1">
        {icon} {kicker}
      </div>
      <h2 className="text-2xl md:text-3xl font-semibold mt-1 tracking-tight">{title}</h2>
    </div>
  );
}
