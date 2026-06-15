import type { Product, ExplainResult, IntentResult } from '../types';
import { getProductById, userProfile } from '../dataAccess';

/**
 * Explanation Agent
 * --------------------------------------------------------------
 * Production target: Bedrock LLM with structured output schema.
 * Prototype: deterministic, transparent reasoning that uses the
 * product attributes + the user's preferences to render a clean
 * "why this?" modal.
 */
export function explain(productId: string, intent?: IntentResult): ExplainResult | null {
  const p = getProductById(productId);
  if (!p) return null;

  const why: string[] = [];
  why.push(`Trust score ${(p.trust_score * 100).toFixed(0)}%, rated ★ ${p.rating} by ${p.reviews.toLocaleString('en-IN')} customers.`);
  if (p.previous_order_count > 0) why.push(`You've ordered this ${p.previous_order_count} times — your trusted repeat.`);
  if (userProfile.preferences.preferred_brands.includes(p.brand)) why.push(`${p.brand} is one of your preferred brands.`);
  if (intent?.dietary?.length) {
    const ok = intent.dietary.every((d) => p.dietary_tags.includes(d) || d === 'vegetarian');
    why.push(ok ? `Matches your ${intent.dietary.join(', ')} preference.` : `Note: dietary check failed for ${intent.dietary.join(', ')}.`);
  }
  why.push(`Reaches Whitefield in ${p.delivery_eta_minutes} min from your nearest dark store.`);

  const alternatives = (p.substitutes || [])
    .map((id) => getProductById(id))
    .filter(Boolean)
    .map((alt) => ({
      id: alt!.id,
      name: alt!.name,
      reason: `${alt!.brand}, ₹${alt!.price}, arrives in ${alt!.delivery_eta_minutes} min`
    }));

  const preference_match = userProfile.preferences.preferred_brands.includes(p.brand)
    ? `${p.brand} is on your preferred-brand list`
    : `New to your shelf, but matches your ${userProfile.preferences.dietary.join(', ')} profile`;

  return {
    why,
    pros: p.pros,
    cons: p.cons,
    usage: p.usage_instructions,
    alternatives,
    preference_match
  };
}
