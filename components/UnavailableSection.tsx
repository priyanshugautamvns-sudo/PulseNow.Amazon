'use client';

import { AlertTriangle, PackageX } from 'lucide-react';
import { inr } from '@/lib/format';
import type { Product } from '@/lib/types';

type OOS = { product: Product; needNote?: string; substitute?: Product | null };
type NIC = { name: string; reason?: string };

/**
 * Renders the catalog-grounded "you can't have this, here's why" sections.
 * Used everywhere the AI returns picks: PulseAssistant, custom emergency,
 * guided shopping, intent results.
 */
export function UnavailableSection({
  notInCatalog,
  outOfStock,
  compact
}: {
  notInCatalog?: NIC[];
  outOfStock?: OOS[];
  compact?: boolean;
}) {
  const hasNIC = (notInCatalog?.length ?? 0) > 0;
  const hasOOS = (outOfStock?.length ?? 0) > 0;
  if (!hasNIC && !hasOOS) return null;

  return (
    <div className="space-y-2">
      {hasOOS && (
        <div className="surface-soft p-3">
          <div className="text-[11px] uppercase tracking-wider text-warn font-semibold flex items-center gap-1 mb-1.5">
            <PackageX className="w-3.5 h-3.5" /> Out of stock
          </div>
          <ul className="space-y-1.5">
            {outOfStock!.map((o, i) => (
              <li key={i} className="text-[12px] leading-snug">
                <span className="text-ink-100 font-medium">{o.product.name}</span>
                <span className="text-ink-300"> · {inr(o.product.price)} · currently unavailable</span>
                {o.substitute && (
                  <div className="text-[11px] text-good mt-0.5">
                    → suggested substitute: <span className="font-medium">{o.substitute.name}</span> ({inr(o.substitute.price)})
                  </div>
                )}
              </li>
            ))}
          </ul>
          {!compact && (
            <div className="text-[11px] text-ink-400 mt-2">
              Out-of-stock items are not added to your cart.
            </div>
          )}
        </div>
      )}

      {hasNIC && (
        <div className="surface-soft p-3 border-l-2 border-warn">
          <div className="text-[11px] uppercase tracking-wider text-warn font-semibold flex items-center gap-1 mb-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Needed but not in catalog
          </div>
          <ul className="space-y-1">
            {notInCatalog!.map((n, i) => (
              <li key={i} className="text-[12px]">
                · <span className="text-ink-100 font-medium">{n.name}</span>
                {n.reason ? <span className="text-ink-400"> — {n.reason}</span> : null}
              </li>
            ))}
          </ul>
          {!compact && (
            <div className="text-[11px] text-ink-400 mt-2">
              These items aren't sold via Pulse Now today. They will not be added to the cart.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
