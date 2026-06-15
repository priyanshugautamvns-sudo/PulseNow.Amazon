import type { Product, RankingBreakdown, IntentResult } from '../types';
import { userProfile, getStockAt } from '../dataAccess';

/**
 * Ranking & Recommendation Agent
 * --------------------------------------------------------------
 * Production target: SageMaker Personalize + Bedrock for re-ranking,
 * with OpenSearch for retrieval and ElastiCache for low-latency joins.
 *
 * For the prototype this is a transparent, weighted ranking formula
 * that is also surfaced on the /dashboard screen so judges can see
 * exactly how recommendations are produced.
 *
 * final_score =
 *   0.25 * intent_match_score +
 *   0.20 * urgency_eta_score  +
 *   0.15 * preference_match_score +
 *   0.15 * trust_score +
 *   0.10 * availability_score +
 *   0.10 * price_value_score +
 *   0.05 * business_margin_score
 *
 * Mode tweaks: emergency boosts ETA + availability; guided boosts
 * intent + trust; reorder boosts previous_order_count.
 */

const BASE_WEIGHTS = {
  intent_match_score: 0.25,
  urgency_eta_score: 0.2,
  preference_match_score: 0.15,
  trust_score: 0.15,
  availability_score: 0.1,
  price_value_score: 0.1,
  business_margin_score: 0.05
};

function modeWeights(intent: IntentResult): Record<string, number> {
  const w = { ...BASE_WEIGHTS };
  if (intent.intent_type === 'emergency') {
    w.urgency_eta_score = 0.3;
    w.availability_score = 0.18;
    w.intent_match_score = 0.2;
    w.price_value_score = 0.07;
    w.business_margin_score = 0.05;
    w.preference_match_score = 0.1;
    w.trust_score = 0.1;
  } else if (intent.intent_type === 'guided') {
    w.intent_match_score = 0.3;
    w.trust_score = 0.2;
    w.preference_match_score = 0.18;
    w.urgency_eta_score = 0.12;
    w.availability_score = 0.08;
    w.price_value_score = 0.07;
    w.business_margin_score = 0.05;
  } else if (intent.intent_type === 'reorder' || intent.intent_type === 'predictive') {
    w.preference_match_score = 0.3;
    w.trust_score = 0.2;
    w.intent_match_score = 0.18;
    w.urgency_eta_score = 0.12;
    w.availability_score = 0.1;
    w.price_value_score = 0.05;
    w.business_margin_score = 0.05;
  }
  return w;
}

function intentMatch(p: Product, intent: IntentResult): number {
  const tags = [...p.tags, ...p.dietary_tags, p.category];
  const cat = intent.category.toLowerCase();
  let score = 0;
  if (tags.some((t) => t.toLowerCase() === cat)) score += 0.5;
  if (tags.some((t) => intent.goal.toLowerCase().includes(t.toLowerCase()))) score += 0.2;
  for (const c of intent.constraints) if (tags.includes(c)) score += 0.2;
  for (const d of intent.dietary) if (p.dietary_tags.includes(d)) score += 0.4;
  // dietary mismatch penalty
  if (intent.dietary.includes('vegan') && !p.dietary_tags.includes('vegan')) score -= 0.6;
  return Math.max(0, Math.min(1, score));
}

function urgencyEta(p: Product, intent: IntentResult): number {
  const eta = p.delivery_eta_minutes;
  // ETA mapped to 0..1 (8 min => 1.0, 30 min => 0.3)
  const score = Math.max(0.1, 1 - (eta - 6) / 30);
  return intent.urgency_score > 0.7 ? Math.min(1, score * 1.1) : score;
}

function preferenceMatch(p: Product): number {
  const prefs = userProfile.preferences;
  let score = 0;
  if (prefs.preferred_brands.includes(p.brand)) score += 0.45;
  if (prefs.dietary.every((d: string) => p.dietary_tags.includes(d) || d === 'vegetarian')) score += 0.2;
  if (prefs.lifestyle_tags.some((t: string) => p.dietary_tags.includes(t) || p.tags.includes(t))) score += 0.15;
  if (p.previous_order_count > 0) score += Math.min(0.3, p.previous_order_count * 0.04);
  return Math.min(1, score);
}

function trust(p: Product): number {
  return Math.min(1, p.trust_score * 0.6 + (p.rating / 5) * 0.4);
}

function availability(p: Product, storeId: string): number {
  const stock = getStockAt(storeId, p.id);
  if (stock <= 0) return 0;
  if (stock < 10) return 0.4;
  if (stock < 30) return 0.7;
  return 1;
}

function priceValue(p: Product): number {
  const discount = p.mrp > 0 ? (p.mrp - p.price) / p.mrp : 0;
  return Math.min(1, 0.5 + discount * 1.2);
}

function businessMargin(p: Product): number {
  return p.margin_score;
}

export function rankProduct(
  p: Product,
  intent: IntentResult,
  storeId = userProfile.last_active_dark_store
): RankingBreakdown {
  const weights = modeWeights(intent);
  const intent_match_score = intentMatch(p, intent);
  const urgency_eta_score = urgencyEta(p, intent);
  const preference_match_score = preferenceMatch(p);
  const trust_score = trust(p);
  const availability_score = availability(p, storeId);
  const price_value_score = priceValue(p);
  const business_margin_score = businessMargin(p);

  const final_score =
    weights.intent_match_score * intent_match_score +
    weights.urgency_eta_score * urgency_eta_score +
    weights.preference_match_score * preference_match_score +
    weights.trust_score * trust_score +
    weights.availability_score * availability_score +
    weights.price_value_score * price_value_score +
    weights.business_margin_score * business_margin_score;

  return {
    intent_match_score,
    urgency_eta_score,
    preference_match_score,
    trust_score,
    availability_score,
    price_value_score,
    business_margin_score,
    final_score: Math.round(final_score * 1000) / 1000,
    weights
  };
}

export function rankProducts(
  productsArr: Product[],
  intent: IntentResult,
  storeId?: string
): { product: Product; ranking: RankingBreakdown }[] {
  return productsArr
    .map((p) => ({ product: p, ranking: rankProduct(p, intent, storeId) }))
    .sort((a, b) => b.ranking.final_score - a.ranking.final_score);
}
