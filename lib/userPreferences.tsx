'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Dietary =
  | 'vegetarian' | 'non-vegetarian' | 'vegan' | 'eggetarian' | 'jain'
  | 'no-onion-garlic' | 'high-protein' | 'low-sugar' | 'organic' | 'gluten-free';

export type HealthCaution =
  | 'diabetes' | 'high-bp' | 'lactose-intolerant' | 'nut-allergy' | 'gluten-sensitive'
  | 'low-sodium' | 'no-spicy' | 'avoid-caffeine' | 'pregnancy-safe' | 'baby-safe'
  | 'elderly-friendly' | 'none' | 'prefer-not-to-say';

export type Interest =
  | 'food-snacks' | 'groceries' | 'vegan' | 'fitness-protein' | 'baby-care'
  | 'cleaning' | 'beauty' | 'personal-care' | 'pooja' | 'hostel' | 'pet-care'
  | 'electronics' | 'home' | 'breakfast' | 'quick-cooking';

export type ShoppingStyle =
  | 'fastest-delivery' | 'best-quality' | 'lowest-price' | 'reorder-same-brand'
  | 'try-new-brands' | 'safe-trusted' | 'bundles';

export type Household =
  | 'living-alone' | 'family' | 'hostel' | 'new-parent' | 'has-baby'
  | 'has-elderly' | 'has-pet' | 'hosts-guests' | 'weekly-cleaning'
  | 'daily-pooja' | 'fitness-focused';

export type ThemeMode = 'light' | 'dark';

export type UserPreferences = {
  onboardingComplete: boolean;
  name: string;
  dietary: Dietary[];
  healthCautions: HealthCaution[];
  interests: Interest[];
  brandPreferences: Record<string, string[]>;
  shoppingStyle: ShoppingStyle[];
  household: Household[];
  language: 'english' | 'hinglish' | 'hindi';
  paymentPreference: 'amazon_pay_upi' | 'card' | 'cod';
  deliveryPreference: 'fastest' | 'standard' | 'eco';
  personalizationEnabled: boolean;
  predictionsEnabled: boolean;
  voiceEnabled: boolean;
  cameraEnabled: boolean;
  reducedMotion: boolean;
  theme: ThemeMode;
};

export const DEFAULT_PREFS: UserPreferences = {
  onboardingComplete: false,
  name: '',
  dietary: [],
  healthCautions: [],
  interests: [],
  brandPreferences: {},
  shoppingStyle: [],
  household: [],
  language: 'english',
  paymentPreference: 'amazon_pay_upi',
  deliveryPreference: 'fastest',
  personalizationEnabled: true,
  predictionsEnabled: true,
  voiceEnabled: true,
  cameraEnabled: true,
  reducedMotion: false,
  theme: 'light'
};

type Ctx = {
  prefs: UserPreferences;
  hydrated: boolean;
  update: (p: Partial<UserPreferences>) => void;
  toggleArray: <K extends keyof UserPreferences>(key: K, value: any) => void;
  reset: () => void;
  forAI: () => Record<string, any>;
};

const Context = createContext<Ctx | null>(null);
const STORAGE_KEY = 'pulse_prefs_v1';

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
    } catch {}
    setHydrated(true);
  }, []);

  // Persist + apply theme on the html element so all CSS vars switch.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {}
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', prefs.theme);
    }
  }, [prefs, hydrated]);

  const update = useCallback((patch: Partial<UserPreferences>) => {
    setPrefs((cur) => ({ ...cur, ...patch }));
  }, []);

  const toggleArray = useCallback(<K extends keyof UserPreferences>(key: K, value: any) => {
    setPrefs((cur) => {
      const arr = Array.isArray(cur[key]) ? ([...(cur[key] as any[])] as any[]) : [];
      const i = arr.indexOf(value);
      if (i >= 0) arr.splice(i, 1);
      else arr.push(value);
      return { ...cur, [key]: arr } as UserPreferences;
    });
  }, []);

  const reset = useCallback(() => {
    setPrefs(DEFAULT_PREFS);
    try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  const forAI = useCallback(() => {
    if (!prefs.personalizationEnabled) return {};
    return {
      dietary: prefs.dietary,
      healthCautions: prefs.healthCautions.filter((h) => h !== 'none' && h !== 'prefer-not-to-say'),
      interests: prefs.interests,
      brandPreferences: prefs.brandPreferences,
      shoppingStyle: prefs.shoppingStyle,
      household: prefs.household,
      language: prefs.language
    };
  }, [prefs]);

  const value: Ctx = useMemo(
    () => ({ prefs, hydrated, update, toggleArray, reset, forAI }),
    [prefs, hydrated, update, toggleArray, reset, forAI]
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useUserPreferences(): Ctx {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useUserPreferences must be used inside UserPreferencesProvider');
  return ctx;
}
