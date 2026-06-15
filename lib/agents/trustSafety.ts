import type { Product } from '../types';

/**
 * Trust & Safety Agent
 * --------------------------------------------------------------
 * Flags products that should not be one-tap ordered without explicit
 * extra confirmation. Sensitive categories: wellness/medicine-like,
 * baby health items, anything tagged requires_caution.
 */
export function requiresExtraConfirmation(p: Product): boolean {
  if (p.requires_caution) return true;
  if (p.category === 'wellness') return true;
  return false;
}

export function safetyDisclaimer(p: Product): string | null {
  if (p.category === 'wellness') {
    return 'For self-limiting symptoms only. Consult a doctor if symptoms persist or worsen. Amazon Pulse Now does not give medical advice.';
  }
  return null;
}
