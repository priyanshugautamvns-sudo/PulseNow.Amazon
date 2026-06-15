'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Legacy `/scan` route — redirects to the new unified `/upload` page,
 * preserving the `mode` query parameter so direct links still work.
 */
function ScanRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = params.get('mode') ?? 'product';
  useEffect(() => {
    router.replace(`/upload?mode=${encodeURIComponent(mode)}`);
  }, [mode, router]);
  return <div className="pt-10 text-ink-300 text-center">Opening Pulse Upload…</div>;
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="pt-10 text-ink-300">Loading…</div>}>
      <ScanRedirect />
    </Suspense>
  );
}
