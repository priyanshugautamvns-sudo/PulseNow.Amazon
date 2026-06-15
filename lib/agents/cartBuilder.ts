import type { Product, IntentResult, SmartCard } from '../types';
import { products, demoScenarios, getProductById, recipes, findRecipeByName } from '../dataAccess';
import { rankProducts, rankProduct } from './rankingAgent';

/**
 * Cart Builder Agent
 * --------------------------------------------------------------
 * Produces 3-4 SmartCards from an intent: Fastest, Best Match,
 * Trusted Repeat, and Smart Combo. Recipe intents (poha, biryani)
 * yield a Recipe Kit card with all ingredients in one bag.
 */

const filterByDiet = (p: Product, intent: IntentResult): boolean => {
  if (intent.dietary?.includes('vegan')) return p.dietary_tags.includes('vegan');
  if (intent.dietary?.includes('vegetarian')) return !p.dietary_tags.includes('non-vegetarian');
  return true;
};

function pickScenarioItems(intent: IntentResult): Product[] | null {
  // Recipe match first
  const recipe = findRecipeByName(intent.raw_input);
  if (recipe) {
    return recipe.ingredients
      .map((i) => getProductById(i.product_id))
      .filter((p): p is Product => Boolean(p));
  }
  // Demo scenario by category
  const scenario = demoScenarios.find((s) => s.category === intent.category);
  if (scenario && Array.isArray(scenario.core_items)) {
    return (scenario.core_items as string[])
      .map((id) => getProductById(id))
      .filter((p): p is Product => Boolean(p));
  }
  return null;
}

function totalPrice(items: { product: Product; qty: number }[]) {
  return items.reduce((s, it) => s + it.product.price * it.qty, 0);
}
function totalMrp(items: { product: Product; qty: number }[]) {
  return items.reduce((s, it) => s + it.product.mrp * it.qty, 0);
}
function maxEta(items: { product: Product; qty: number }[]) {
  return items.reduce((m, it) => Math.max(m, it.product.delivery_eta_minutes), 0);
}

function trustIndicators(p: Product): string[] {
  const out: string[] = [];
  if (p.is_prime) out.push('Prime/Now');
  if (p.is_bestseller) out.push('Bestseller');
  if (p.previous_order_count > 0) out.push(`Re-ordered ${p.previous_order_count}×`);
  if (p.rating >= 4.5) out.push(`★ ${p.rating}`);
  if (p.stock_count > 50) out.push('In stock');
  return out;
}

function ingredientLine(productId: string, recipeNote?: string): string | undefined {
  const r = recipes.flatMap((rc) => rc.ingredients).find((i) => i.product_id === productId);
  return recipeNote ?? r?.note;
}

export function buildSmartCards(intent: IntentResult): SmartCard[] {
  const cards: SmartCard[] = [];
  const isRecipe = intent.cart_type === 'recipe_kit' || !!findRecipeByName(intent.raw_input);

  const scenarioItems = pickScenarioItems(intent);
  const candidatePool = scenarioItems
    ? scenarioItems.filter((p) => filterByDiet(p, intent))
    : products.filter((p) => filterByDiet(p, intent));

  const ranked = rankProducts(candidatePool, intent);

  // ---------- For RECIPE intents, the primary card is the kit ----------
  if (isRecipe && scenarioItems && scenarioItems.length >= 3) {
    const items = scenarioItems.map((p) => ({ product: p, qty: 1 }));
    const eta = maxEta(items);
    const recipe = findRecipeByName(intent.raw_input);
    cards.push({
      id: 'card_recipe_kit',
      type: 'smart_combo',
      title: recipe ? `${recipe.label} Kit` : 'Recipe Kit',
      subtitle: `${items.length} ingredients · ready in ${eta} min`,
      badge: '🍳 Recipe',
      items,
      price_total: totalPrice(items),
      mrp_total: totalMrp(items),
      eta_minutes: eta,
      reason: `Everything you need for ${recipe?.label ?? intent.goal}, picked together so nothing is missing.`,
      trust_indicators: ['One delivery', 'All in stock', 'Ranked by quality'],
      ranking: aggregateRanking(scenarioItems, intent)
    });
  }

  // ---------- Card A: Fastest to Door ----------
  const fastestItem = [...ranked].sort(
    (a, b) => a.product.delivery_eta_minutes - b.product.delivery_eta_minutes
  )[0];
  if (fastestItem) {
    const items = [{ product: fastestItem.product, qty: 1 }];
    cards.push({
      id: 'card_fastest',
      type: 'fastest',
      title: 'Fastest to Door',
      subtitle: `Arrives in ${fastestItem.product.delivery_eta_minutes} min`,
      badge: '⚡ Fastest',
      items,
      price_total: totalPrice(items),
      mrp_total: totalMrp(items),
      eta_minutes: fastestItem.product.delivery_eta_minutes,
      reason: `Closest dark-store stock and quickest pick-pack for your address.`,
      trust_indicators: trustIndicators(fastestItem.product),
      ranking: fastestItem.ranking
    });
  }

  // ---------- Card B: Best Match ----------
  const best = ranked[0];
  if (best && best.product.id !== fastestItem?.product.id) {
    const items = [{ product: best.product, qty: 1 }];
    cards.push({
      id: 'card_best',
      type: 'best_match',
      title: 'Best Match for Your Need',
      subtitle: `${best.product.brand} • ★ ${best.product.rating}`,
      badge: '🎯 AI Pick',
      items,
      price_total: totalPrice(items),
      mrp_total: totalMrp(items),
      eta_minutes: best.product.delivery_eta_minutes,
      reason: `Top match for "${intent.goal}" balancing rating, fit, and trust.`,
      trust_indicators: trustIndicators(best.product),
      ranking: best.ranking
    });
  }

  // ---------- Card C: Trusted Repeat ----------
  const repeat = ranked.find((r) => r.product.previous_order_count > 0 && r.product.id !== best?.product.id);
  if (repeat) {
    const items = [{ product: repeat.product, qty: 1 }];
    cards.push({
      id: 'card_repeat',
      type: 'trusted_repeat',
      title: 'Your Usual Choice',
      subtitle: `Re-ordered ${repeat.product.previous_order_count}× before`,
      badge: '🔁 Trusted Repeat',
      items,
      price_total: totalPrice(items),
      mrp_total: totalMrp(items),
      eta_minutes: repeat.product.delivery_eta_minutes,
      reason: `You've trusted this ${repeat.product.previous_order_count} times. Same brand, same SKU.`,
      trust_indicators: trustIndicators(repeat.product),
      ranking: repeat.ranking
    });
  }

  // ---------- Card D: Smart Combo (non-recipe scenarios) ----------
  if (!isRecipe && scenarioItems && scenarioItems.length >= 3) {
    const items = scenarioItems.map((p) => ({ product: p, qty: 1 }));
    const eta = maxEta(items);
    const isEmergency = intent.intent_type === 'emergency';
    cards.push({
      id: 'card_combo',
      type: 'smart_combo',
      title: isEmergency ? 'Emergency Kit Combo' : 'Smart Combo',
      subtitle: `${items.length} items · ready in ${eta} min`,
      badge: '🛍️ Bundle',
      items,
      price_total: totalPrice(items),
      mrp_total: totalMrp(items),
      eta_minutes: eta,
      reason: `Hand-picked bundle for "${intent.goal}". Saves ${formatINR(
        totalMrp(items) - totalPrice(items)
      )} vs. MRP.`,
      trust_indicators: ['Bundle saving', 'Single delivery', 'All in stock'],
      ranking: aggregateRanking(scenarioItems, intent)
    });
  }

  return cards;
}

function aggregateRanking(items: Product[], intent: IntentResult) {
  const breakdowns = items.map((p) => rankProduct(p, intent));
  const n = breakdowns.length || 1;
  const sum = breakdowns.reduce(
    (acc, r) => ({
      intent_match_score: acc.intent_match_score + r.intent_match_score,
      urgency_eta_score: acc.urgency_eta_score + r.urgency_eta_score,
      preference_match_score: acc.preference_match_score + r.preference_match_score,
      trust_score: acc.trust_score + r.trust_score,
      availability_score: acc.availability_score + r.availability_score,
      price_value_score: acc.price_value_score + r.price_value_score,
      business_margin_score: acc.business_margin_score + r.business_margin_score,
      final_score: acc.final_score + r.final_score,
      weights: r.weights
    }),
    {
      intent_match_score: 0,
      urgency_eta_score: 0,
      preference_match_score: 0,
      trust_score: 0,
      availability_score: 0,
      price_value_score: 0,
      business_margin_score: 0,
      final_score: 0,
      weights: {} as Record<string, number>
    }
  );
  return {
    intent_match_score: sum.intent_match_score / n,
    urgency_eta_score: sum.urgency_eta_score / n,
    preference_match_score: sum.preference_match_score / n,
    trust_score: sum.trust_score / n,
    availability_score: sum.availability_score / n,
    price_value_score: sum.price_value_score / n,
    business_margin_score: sum.business_margin_score / n,
    final_score: Math.round((sum.final_score / n) * 1000) / 1000,
    weights: sum.weights
  };
}

function formatINR(n: number) {
  return `₹${Math.max(0, Math.round(n))}`;
}

/**
 * Build emergency mode tiered carts using the explicit per-tier
 * spec from data/demoScenarios.json. Quantities scale with `count`
 * (e.g. number of guests).
 */
export function buildEmergencyTiers(scenarioId: string, count = 4) {
  const scenario = demoScenarios.find((s) => s.id === scenarioId);
  if (!scenario || !scenario.tier_items) return null;

  const expand = (spec: any[]) =>
    spec
      .map((row: any) => {
        const product = getProductById(row.id);
        if (!product) return null;
        let qty = 1;
        if (typeof row.qty === 'number') qty = row.qty;
        if (typeof row.per_guest === 'number') qty = Math.max(1, Math.round(row.per_guest * count));
        if (typeof row.per_guest_div === 'number') qty = Math.max(1, Math.ceil(count / row.per_guest_div));
        return { product, qty };
      })
      .filter(Boolean) as { product: Product; qty: number }[];

  const fastest = expand(scenario.tier_items.fastest ?? []);
  const premium = expand(scenario.tier_items.premium ?? []);
  const budget = expand(scenario.tier_items.budget ?? []);

  const sumPrice = (arr: { product: Product; qty: number }[]) =>
    arr.reduce((s, it) => s + it.product.price * it.qty, 0);
  const sumMrp = (arr: { product: Product; qty: number }[]) =>
    arr.reduce((s, it) => s + it.product.mrp * it.qty, 0);
  const sumEta = (arr: { product: Product; qty: number }[]) =>
    arr.length ? Math.max(...arr.map((it) => it.product.delivery_eta_minutes)) : 0;

  return {
    fastest: { items: fastest, price: sumPrice(fastest), mrp: sumMrp(fastest), eta: sumEta(fastest) },
    premium: { items: premium, price: sumPrice(premium), mrp: sumMrp(premium), eta: sumEta(premium) },
    budget: { items: budget, price: sumPrice(budget), mrp: sumMrp(budget), eta: sumEta(budget) }
  };
}
