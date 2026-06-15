'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, ChevronRight, Sparkles, ShieldCheck } from 'lucide-react';
import questions from '@/data/onboardingQuestions.json';
import { useUserPreferences } from '@/lib/userPreferences';

const STEPS = ['name', 'dietary', 'healthCautions', 'interests', 'brands', 'shoppingStyle', 'household', 'done'] as const;
type Step = (typeof STEPS)[number];

export default function OnboardingPage() {
  const router = useRouter();
  const { prefs, update, toggleArray } = useUserPreferences();
  const [step, setStep] = useState<Step>('name');

  const idx = STEPS.indexOf(step);
  const progress = ((idx + 1) / STEPS.length) * 100;

  const next = () => setStep(STEPS[Math.min(idx + 1, STEPS.length - 1)]);
  const back = () => setStep(STEPS[Math.max(idx - 1, 0)]);

  /**
   * Skip onboarding entirely — go straight to the home page and mark
   * onboarding "complete" with personalisation off so the auto-redirect
   * stops re-routing the user back to /onboarding.
   */
  const skipAll = () => {
    update({
      onboardingComplete: true,
      personalizationEnabled: false
    });
    router.replace('/?welcome=skipped');
  };

  /** Skip just this step (continue to the next). */
  const skipStep = () => next();

  const finish = () => {
    update({ onboardingComplete: true });
    router.replace('/?welcome=1');
  };

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <div className="sticky top-0 z-30 bg-canvas/80 backdrop-blur border-b border-line">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center gap-3">
          <button
            onClick={back}
            disabled={idx === 0}
            className="w-9 h-9 rounded-full border border-line flex items-center justify-center hover:bg-muted disabled:opacity-30"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-wider text-ink-300 font-semibold">Step {idx + 1} of {STEPS.length}</div>
            <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-brand-amber to-brand-deep"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 18 }}
              />
            </div>
          </div>
          {idx < STEPS.length - 1 && (
            <button
              onClick={skipAll}
              className="text-[12px] text-ink-300 hover:text-ink-100 px-2 py-1 rounded-md hover:bg-muted"
            >
              Skip onboarding
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-8 pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {step === 'name' && <Welcome onNext={next} prefs={prefs} update={update} onSkipAll={skipAll} />}
            {step === 'dietary' && (
              <Question
                title={questions.dietary.title}
                subtitle={questions.dietary.subtitle}
                options={questions.dietary.options as any}
                selected={prefs.dietary}
                onToggle={(v) => toggleArray('dietary', v)}
              />
            )}
            {step === 'healthCautions' && (
              <Question
                title={questions.healthCautions.title}
                subtitle={questions.healthCautions.subtitle}
                options={questions.healthCautions.options as any}
                selected={prefs.healthCautions}
                onToggle={(v) => toggleArray('healthCautions', v)}
                privacy="You can edit or delete these any time from Settings. We never give medical advice."
              />
            )}
            {step === 'interests' && (
              <Question
                title={questions.interests.title}
                subtitle={questions.interests.subtitle}
                options={questions.interests.options as any}
                selected={prefs.interests}
                onToggle={(v) => toggleArray('interests', v)}
                cols={3}
              />
            )}
            {step === 'brands' && <BrandsStep prefs={prefs} update={update} />}
            {step === 'shoppingStyle' && (
              <Question
                title={questions.shoppingStyle.title}
                subtitle={questions.shoppingStyle.subtitle}
                options={questions.shoppingStyle.options as any}
                selected={prefs.shoppingStyle}
                onToggle={(v) => toggleArray('shoppingStyle', v)}
              />
            )}
            {step === 'household' && (
              <Question
                title={questions.household.title}
                subtitle={questions.household.subtitle}
                options={questions.household.options as any}
                selected={prefs.household}
                onToggle={(v) => toggleArray('household', v)}
                cols={3}
              />
            )}
            {step === 'done' && <Done onFinish={finish} prefs={prefs} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {step !== 'done' && step !== 'name' && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-canvas/90 backdrop-blur border-t border-line">
          <div className="max-w-2xl mx-auto px-5 py-3 flex items-center gap-3">
            <button onClick={skipStep} className="btn-ghost flex-1 md:flex-none md:px-6">
              Skip step
            </button>
            <button onClick={next} className="btn-primary flex-1 md:flex-none md:px-6">
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Welcome({ onNext, prefs, update, onSkipAll }: { onNext: () => void; prefs: any; update: (p: any) => void; onSkipAll: () => void }) {
  return (
    <div className="text-center py-6">
      <div className="relative inline-flex w-20 h-20 rounded-3xl overflow-hidden ring-1 ring-white/10 bg-muted">
        <Image src="/logo.png" alt="Pulse" fill sizes="80px" className="object-cover" priority />
      </div>
      <div className="mt-4 text-[11px] uppercase tracking-[0.2em] text-brand-amber font-semibold">Welcome to Pulse Now</div>
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2">
        Let's make this <span className="gradient-text">yours</span>.
      </h1>
      <p className="text-ink-300 mt-2 max-w-md mx-auto">
        A few quick questions and Pulse will know exactly what to surface — fastest, trusted, on-brand. You can change everything later in Settings.
      </p>

      <div className="mt-8 max-w-sm mx-auto text-left">
        <label className="text-[12px] uppercase tracking-wider text-ink-300 font-semibold">What should we call you? <span className="text-ink-400 normal-case font-normal">(optional)</span></label>
        <input
          autoFocus
          value={prefs.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="e.g. Priya"
          className="mt-2 w-full bg-surface border border-line rounded-xl px-4 py-3 text-[15px] focus:border-brand-orange/40 outline-none"
        />
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        <button onClick={onNext} className="btn-primary w-full max-w-sm">
          Personalise my experience <ArrowRight className="w-4 h-4" />
        </button>
        <button onClick={onSkipAll} className="text-[13px] text-ink-300 hover:text-ink-100">
          Skip for now — take me to the app
        </button>
        <p className="text-[11px] text-ink-400 max-w-sm flex items-center gap-1.5 mt-2">
          <ShieldCheck className="w-3.5 h-3.5 text-good" />
          Preferences stay on this device. Edit or delete in Settings any time.
        </p>
      </div>
    </div>
  );
}

function Question({
  title, subtitle, options, selected, onToggle, cols = 2, privacy
}: {
  title: string;
  subtitle: string;
  options: { value: string; label: string; icon?: string }[];
  selected: string[];
  onToggle: (v: string) => void;
  cols?: 2 | 3;
  privacy?: string;
}) {
  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h2>
      <p className="text-ink-300 mt-1.5 text-[14px]">{subtitle}</p>

      <div className={`mt-6 grid gap-2 ${cols === 3 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2'}`}>
        {options.map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <motion.button
              key={opt.value}
              whileTap={{ scale: 0.97 }}
              onClick={() => onToggle(opt.value)}
              className={`relative text-left p-3.5 rounded-xl border transition flex items-center gap-2.5 ${
                active
                  ? 'bg-brand-orange/12 border-brand-orange/50 text-brand-amber'
                  : 'bg-surface border-line hover:border-brand-orange/30 hover:bg-muted text-ink-100'
              }`}
            >
              <span className="text-xl">{opt.icon}</span>
              <span className="text-[14px] font-medium leading-tight flex-1">{opt.label}</span>
              {active && <Check className="w-4 h-4 text-brand-amber shrink-0" />}
            </motion.button>
          );
        })}
      </div>

      {privacy && (
        <div className="mt-5 surface-soft p-3 text-[12px] text-ink-300 flex gap-2 items-start">
          <ShieldCheck className="w-3.5 h-3.5 mt-0.5 text-good shrink-0" />
          <span>{privacy}</span>
        </div>
      )}
    </div>
  );
}

function BrandsStep({ prefs, update }: { prefs: any; update: (p: any) => void }) {
  const cats = (questions.brands.categories as any[]) ?? [];
  const meta = (questions.brands.metaOptions as any[]) ?? [];

  const toggleBrand = (categoryId: string, brand: string) => {
    const cur = prefs.brandPreferences?.[categoryId] ?? [];
    const has = cur.includes(brand);
    const nextArr = has ? cur.filter((b: string) => b !== brand) : [...cur, brand];
    update({ brandPreferences: { ...prefs.brandPreferences, [categoryId]: nextArr } });
  };

  const toggleMeta = (m: string) => {
    const arr = prefs.brandPreferences?.['meta'] ?? [];
    const next = arr.includes(m) ? arr.filter((x: string) => x !== m) : [...arr, m];
    update({ brandPreferences: { ...prefs.brandPreferences, meta: next } });
  };

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">{questions.brands.title}</h2>
      <p className="text-ink-300 mt-1.5 text-[14px]">{questions.brands.subtitle}</p>

      <div className="mt-6 space-y-5">
        {cats.map((cat) => (
          <div key={cat.id}>
            <div className="text-[11px] uppercase tracking-wider text-ink-300 font-semibold mb-2">{cat.label}</div>
            <div className="flex flex-wrap gap-2">
              {cat.options.map((b: string) => {
                const active = (prefs.brandPreferences?.[cat.id] ?? []).includes(b);
                return (
                  <button
                    key={b}
                    onClick={() => toggleBrand(cat.id, b)}
                    className={`px-3 py-1.5 rounded-full border text-[13px] transition ${
                      active
                        ? 'bg-brand-orange/12 border-brand-orange/50 text-brand-amber'
                        : 'bg-surface border-line hover:border-brand-orange/30 text-ink-100'
                    }`}
                  >
                    {b}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div>
          <div className="text-[11px] uppercase tracking-wider text-ink-300 font-semibold mb-2">Bonus rules</div>
          <div className="flex flex-wrap gap-2">
            {meta.map((m) => {
              const active = (prefs.brandPreferences?.['meta'] ?? []).includes(m.value);
              return (
                <button
                  key={m.value}
                  onClick={() => toggleMeta(m.value)}
                  className={`px-3 py-1.5 rounded-full border text-[13px] transition flex items-center gap-1.5 ${
                    active
                      ? 'bg-brand-orange/12 border-brand-orange/50 text-brand-amber'
                      : 'bg-surface border-line hover:border-brand-orange/30 text-ink-100'
                  }`}
                >
                  <span>{m.icon}</span>
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Done({ onFinish, prefs }: { onFinish: () => void; prefs: any }) {
  const summary = useMemo(
    () =>
      [
        prefs.dietary?.length ? `${prefs.dietary.length} diet preferences` : null,
        prefs.healthCautions?.length ? `${prefs.healthCautions.filter((h: string) => h !== 'none' && h !== 'prefer-not-to-say').length} health notes` : null,
        prefs.interests?.length ? `${prefs.interests.length} interests` : null,
        prefs.shoppingStyle?.length ? `${prefs.shoppingStyle.length} shopping styles` : null,
        prefs.household?.length ? `${prefs.household.length} household tags` : null
      ].filter(Boolean) as string[],
    [prefs]
  );

  return (
    <div className="text-center py-6">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-good/15 border border-good/30 text-good">
        <Sparkles className="w-7 h-7" />
      </div>
      <div className="mt-3 text-[11px] uppercase tracking-[0.2em] text-good font-semibold">All set</div>
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2">
        Pulse is now <span className="gradient-text">yours</span>.
      </h1>
      <p className="text-ink-300 mt-2 max-w-md mx-auto">
        Hi {prefs.name || 'there'} — every recommendation from now on respects your preferences.
      </p>

      {summary.length > 0 && (
        <div className="mt-6 inline-flex flex-wrap gap-2 justify-center max-w-md">
          {summary.map((s) => <span key={s} className="pill-orange">{s}</span>)}
        </div>
      )}

      <div className="mt-8 flex flex-col items-center gap-3">
        <button onClick={onFinish} className="btn-primary w-full max-w-sm">
          Open Pulse Now <ChevronRight className="w-4 h-4" />
        </button>
        <p className="text-[11px] text-ink-400">Edit any of this from Settings.</p>
      </div>
    </div>
  );
}
