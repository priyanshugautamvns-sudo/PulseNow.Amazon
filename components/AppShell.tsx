'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Siren, MessageSquareDashed, Upload as UploadIcon, Calendar } from 'lucide-react';
import { classNames } from '@/lib/format';
import { useUserPreferences } from '@/lib/userPreferences';
import { FeaturePanel } from './FeaturePanel';

const PRIMARY_NAV = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/guided', label: 'Guided', icon: MessageSquareDashed },
  { href: '/emergency', label: 'Emergency', icon: Siren },
  { href: '/upload', label: 'Upload', icon: UploadIcon },
  { href: '/scheduled-orders', label: 'Schedules', icon: Calendar }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { prefs, hydrated } = useUserPreferences();
  const [panelOpen, setPanelOpen] = useState(false);

  // Auto-route to onboarding only AFTER hydration to avoid SSR/CSR mismatch
  useEffect(() => {
    if (!hydrated) return;
    if (!prefs.onboardingComplete && pathname !== '/onboarding' && pathname !== '/pitch') {
      router.replace('/onboarding');
    }
  }, [hydrated, prefs.onboardingComplete, pathname, router]);

  const isPitch = pathname?.startsWith('/pitch');
  const isOnboarding = pathname?.startsWith('/onboarding');
  const isWide = pathname?.startsWith('/dashboard') || pathname?.startsWith('/pitch');

  if (isPitch || isOnboarding) return <div className="min-h-screen">{children}</div>;

  const initial = (prefs.name?.[0] ?? 'P').toUpperCase();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-surface/85 backdrop-blur border-b border-line">
        <div className={classNames(isWide ? 'max-w-6xl' : 'max-w-md md:max-w-3xl', 'mx-auto px-4 md:px-6 py-3 flex items-center gap-3')}>
          <Link href="/" className="flex items-center gap-2 group">
            <span className="relative inline-flex w-8 h-8 rounded-lg overflow-hidden ring-1 ring-line bg-muted">
              <Image src="/logo.png" alt="Pulse Now" fill sizes="32px" className="object-cover" priority />
            </span>
            <div className="leading-tight">
              <div className="text-[10px] uppercase tracking-[0.16em] text-ink-300 font-semibold">amazon</div>
              <div className="text-[15px] font-semibold tracking-tight">Pulse Now</div>
            </div>
          </Link>

          <nav className="ml-auto hidden md:flex items-center gap-1">
            {PRIMARY_NAV.map((n) => {
              const Icon = n.icon;
              const active = pathname === n.href || (n.href !== '/' && pathname?.startsWith(n.href));
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={classNames(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] transition',
                    active ? 'bg-muted text-brand-amber font-semibold' : 'text-ink-300 hover:text-ink-100 hover:bg-muted/60'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <button
            onClick={() => setPanelOpen(true)}
            aria-label="Open profile and settings"
            className="ml-auto md:ml-2 w-9 h-9 rounded-full bg-gradient-to-br from-brand-amber to-brand-deep text-white font-bold flex items-center justify-center hover:opacity-90 transition"
          >
            {initial}
          </button>
        </div>
      </header>

      <main className={classNames('flex-1 pb-32 md:pb-10 w-full', isWide ? 'max-w-6xl mx-auto px-4 md:px-6' : 'max-w-md md:max-w-3xl mx-auto px-4 md:px-6')}>
        {children}
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 px-3 pb-3 pt-2 bg-canvas/95 backdrop-blur border-t border-line">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {PRIMARY_NAV.map((n) => {
            const Icon = n.icon;
            const active = pathname === n.href || (n.href !== '/' && pathname?.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                className={classNames(
                  'flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl flex-1',
                  active ? 'text-brand-amber' : 'text-ink-300'
                )}
              >
                <Icon className={classNames('w-5 h-5', active && 'stroke-[2.4]')} />
                <span className="text-[10px] font-medium">{n.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <FeaturePanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </div>
  );
}
