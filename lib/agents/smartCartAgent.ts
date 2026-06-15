import { products, getProductById, findRecipeByName } from '../dataAccess';
import { isBedrockEnabled, bedrockJSON, ALLOW_MOCK, aiConfigError } from '../aws/bedrockClient';
import { detectLanguage, type Lang } from './language';
import type { Product } from '../types';

export type StockStatus = 'available' | 'low_stock' | 'out_of_stock' | 'not_in_catalog';

export type Pick = { product: Product; qty: number; note?: string; status?: StockStatus };

export type SmartCartResult = {
  message: string;
  picks: Pick[];
  outOfStock: { product: Product; needNote?: string; substitute?: Product | null; substituteReason?: string }[];
  notInCatalog: { name: string; reason?: string }[];
  warnings: string[];
  source: 'bedrock' | 'recipe' | 'mock';
  followUp?: string | null;
  detectedIntent?: string;
  language?: Lang;
  error?: string;
};

type Preferences = {
  dietary?: string[];
  healthCautions?: string[];
  interests?: string[];
  brandPreferences?: Record<string, string[]>;
  shoppingStyle?: string[];
  household?: string[];
  language?: Lang;
};

const SYSTEM = `You are Pulse, the catalog-grounded shopping AI for Amazon Now (India).

LANGUAGE RULE:
- Detect language of user input: english | hindi | hinglish.
- ALWAYS respond in the same language. Match script (Devanagari for Hindi, Roman for Hinglish).

PRODUCT RULES:
- Output STRICT JSON. No prose. No markdown fences.
- Choose products by their product_id from the catalog provided. Never invent ids.
- If a needed item is NOT in catalog, list it under notInCatalog with the plain name.
- Respect dietary, health, and brand preferences strictly.
- Wellness items: include a one-line caution. Never give medical advice.
- Quantities scale with the request.

OUTPUT SCHEMA:
{
  "message": "string (1-2 sentences in detected language)",
  "detectedIntent": "string short label",
  "language": "english | hindi | hinglish",
  "picks": [{ "product_id": "string", "qty": number, "note": "string optional" }],
  "notInCatalog": [{ "name": "string", "reason": "string optional" }],
  "warnings": ["string"],
  "followUp": "string|null"
}`;

function catalogSummary(): string {
  return products
    .map(
      (p) =>
        `${p.id} | ${p.name} | ${p.category} | ${p.brand} | ₹${p.price} | tags: ${[...p.tags, ...p.dietary_tags].slice(0, 6).join(', ')} | stock: ${p.stock_count <= 0 ? 'OUT' : p.stock_count < 10 ? 'LOW' : 'OK'}`
    )
    .join('\n');
}

type LLMOut = {
  message?: string;
  detectedIntent?: string;
  language?: Lang;
  picks?: { product_id: string; qty: number; note?: string }[];
  notInCatalog?: { name: string; reason?: string }[];
  warnings?: string[];
  followUp?: string | null;
};

function classifyStock(p: Product): StockStatus {
  if (p.stock_count <= 0) return 'out_of_stock';
  if (p.stock_count < 10) return 'low_stock';
  return 'available';
}

function violatesPreferences(p: Product, prefs?: Preferences): string | null {
  if (!prefs?.dietary?.length) return null;
  if (prefs.dietary.includes('vegan') && !p.dietary_tags.includes('vegan')) return `Skipped ${p.name} — does not match vegan preference.`;
  if (prefs.dietary.includes('vegetarian') && p.dietary_tags.includes('non-vegetarian')) return `Skipped ${p.name} — non-vegetarian.`;
  if (prefs.dietary.includes('jain') && (p.tags.includes('onion') || p.tags.includes('garlic'))) return `Skipped ${p.name} — contains onion/garlic.`;
  return null;
}

/**
 * Substitute scoring formula:
 *   substituteScore =
 *     0.30 * sameCategoryScore +
 *     0.25 * preferenceMatchScore +
 *     0.20 * availabilityScore +
 *     0.10 * etaScore +
 *     0.10 * ratingTrustScore +
 *     0.05 * priceSimilarityScore
 *
 * Returns the best in-stock substitute or null when no relevant one exists.
 */
function rankSubstitute(target: Product, prefs?: Preferences): { product: Product; score: number; reason: string } | null {
  // Pool: explicit substitutes first, then same-category alternatives.
  const pool: Product[] = [];
  for (const sid of target.substitutes ?? []) {
    const sub = getProductById(sid);
    if (sub) pool.push(sub);
  }
  for (const p of products) {
    if (p.id === target.id) continue;
    if (pool.find((x) => x.id === p.id)) continue;
    if (p.category === target.category) pool.push(p);
  }

  let best: { product: Product; score: number; reason: string } | null = null;
  for (const candidate of pool) {
    if (classifyStock(candidate) === 'out_of_stock') continue;
    if (violatesPreferences(candidate, prefs)) continue;

    const sameCategoryScore = candidate.category === target.category ? 1 : 0;
    const preferenceMatchScore = (() => {
      const prefBrands = Object.values(prefs?.brandPreferences ?? {}).flat() as string[];
      let score = 0.5; // neutral baseline
      if (prefBrands.includes(candidate.brand)) score = 1;
      // dietary match boost
      if (prefs?.dietary?.length) {
        const matches = prefs.dietary.every((d) => candidate.dietary_tags.includes(d) || ['vegetarian', 'high-protein', 'low-sugar', 'organic', 'gluten-free'].includes(d));
        if (matches) score = Math.max(score, 0.85);
      }
      return score;
    })();
    const availabilityScore = candidate.stock_count >= 50 ? 1 : candidate.stock_count >= 10 ? 0.7 : 0.4;
    const etaScore = Math.max(0, 1 - (candidate.delivery_eta_minutes - 6) / 30);
    const ratingTrustScore = (candidate.trust_score * 0.6) + ((candidate.rating ?? 4) / 5) * 0.4;
    const priceSimilarityScore = Math.max(0, 1 - Math.abs(candidate.price - target.price) / Math.max(target.price, 1));

    const score =
      0.30 * sameCategoryScore +
      0.25 * preferenceMatchScore +
      0.20 * availabilityScore +
      0.10 * etaScore +
      0.10 * ratingTrustScore +
      0.05 * priceSimilarityScore;

    const reasonParts: string[] = [];
    if (candidate.category === target.category) reasonParts.push(`same category (${target.category})`);
    if (preferenceMatchScore >= 0.85) reasonParts.push('matches your preferences');
    if (candidate.delivery_eta_minutes <= target.delivery_eta_minutes + 3) reasonParts.push(`arrives in ${candidate.delivery_eta_minutes} min`);
    if (priceSimilarityScore >= 0.7) reasonParts.push('similar price');
    const reason = reasonParts.length ? reasonParts.join(' · ') : 'best in-stock alternative';

    if (!best || score > best.score) best = { product: candidate, score, reason };
  }

  // Threshold — don't propose a weak match.
  if (best && best.score >= 0.45) return best;
  return null;
}

export async function buildSmartCart(query: string, prefs?: Preferences): Promise<SmartCartResult> {
  const language = detectLanguage(query);

  // Recipe shortcut.
  const recipe = findRecipeByName(query);
  if (recipe) {
    const picks: Pick[] = [];
    const outOfStock: SmartCartResult['outOfStock'] = [];
    const warnings: string[] = [];
    for (const ing of recipe.ingredients) {
      const product = getProductById(ing.product_id);
      if (!product) continue;
      const violation = violatesPreferences(product, prefs);
      if (violation) { warnings.push(violation); continue; }
      const status = classifyStock(product);
      if (status === 'out_of_stock') {
        const sub = rankSubstitute(product, prefs);
        outOfStock.push({ product, needNote: ing.note, substitute: sub?.product ?? null, substituteReason: sub?.reason });
        if (sub) picks.push({ product: sub.product, qty: ing.qty ?? 1, note: `substitute for ${product.brand}` });
      } else {
        picks.push({ product, qty: ing.qty ?? 1, note: ing.note, status });
      }
    }
    return {
      message: `Catalog-grounded ${recipe.label.toLowerCase()} kit.`,
      picks, outOfStock, notInCatalog: [], warnings,
      source: 'recipe', detectedIntent: 'recipe:' + recipe.id, language
    };
  }

  // Config check
  const cfgError = aiConfigError();
  if (cfgError) {
    if (!ALLOW_MOCK) {
      return { message: cfgError, picks: [], outOfStock: [], notInCatalog: [], warnings: [], source: 'mock', error: cfgError, language };
    }
    return offlineFallback(query, prefs, language);
  }

  if (isBedrockEnabled()) {
    try {
      const sys =
        SYSTEM +
        '\n\nUSER PREFERENCES:\n' + JSON.stringify(prefs ?? {}) +
        `\n\nDETECTED INPUT LANGUAGE: ${language}\nYou MUST respond in ${language}.` +
        '\n\nCATALOG (id | name | category | brand | price | tags | stock):\n' + catalogSummary();

      const out = await bedrockJSON<LLMOut>(sys, query, { maxTokens: 900, temperature: 0.25 });
      return assembleResult(out, prefs, 'bedrock', language);
    } catch (e: any) {
      console.error('[smartCartAgent] Bedrock error:', e?.message ?? e);
      if (!ALLOW_MOCK) {
        return {
          message: humaniseError(e),
          picks: [], outOfStock: [], notInCatalog: [], warnings: [],
          source: 'mock', error: e?.message ?? 'AI call failed', language
        };
      }
      return offlineFallback(query, prefs, language);
    }
  }
  return ALLOW_MOCK
    ? offlineFallback(query, prefs, language)
    : { message: 'AI is not configured.', picks: [], outOfStock: [], notInCatalog: [], warnings: [], source: 'mock', error: 'AI disabled', language };
}

function assembleResult(out: LLMOut, prefs: Preferences | undefined, source: 'bedrock' | 'mock', language: Lang): SmartCartResult {
  const picks: Pick[] = [];
  const outOfStock: SmartCartResult['outOfStock'] = [];
  const notInCatalog: SmartCartResult['notInCatalog'] = out.notInCatalog ?? [];
  const warnings: string[] = out.warnings ?? [];

  for (const row of out.picks ?? []) {
    const product = getProductById(row.product_id);
    if (!product) {
      notInCatalog.push({ name: row.product_id, reason: 'AI suggested an ID not in catalog' });
      continue;
    }
    const violation = violatesPreferences(product, prefs);
    if (violation) { warnings.push(violation); continue; }
    const status = classifyStock(product);
    if (status === 'out_of_stock') {
      const sub = rankSubstitute(product, prefs);
      outOfStock.push({ product, needNote: row.note, substitute: sub?.product ?? null, substituteReason: sub?.reason });
      if (sub) picks.push({ product: sub.product, qty: row.qty || 1, note: `substitute for ${product.brand}`, status: classifyStock(sub.product) });
    } else {
      picks.push({ product, qty: row.qty || 1, note: row.note, status });
    }
  }

  return {
    message: out.message ?? '',
    picks, outOfStock, notInCatalog, warnings,
    source, detectedIntent: out.detectedIntent,
    language: out.language ?? language,
    followUp: out.followUp ?? null
  };
}

function humaniseError(e: any): string {
  const msg = String(e?.message ?? e);
  if (/AccessDenied/i.test(msg)) return 'AI access is not enabled for this Bedrock model. Open the Bedrock console → Model access → grant Anthropic Claude Sonnet 4.5.';
  if (/ValidationException/i.test(msg)) return 'AI request was rejected by Bedrock. Check the model id and region in .env.local.';
  if (/Throttling/i.test(msg)) return 'AI is rate-limiting requests. Try again in a moment.';
  if (/ResourceNotFound/i.test(msg)) return 'Bedrock model not found in this region.';
  return 'AI request failed: ' + msg;
}

function offlineFallback(query: string, prefs: Preferences | undefined, language: Lang): SmartCartResult {
  const tokens = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
  const scored = products.map((p) => {
    const hay = [...p.tags, ...p.dietary_tags, p.category, p.brand, p.name].map((s) => s.toLowerCase());
    let score = 0;
    for (const t of tokens) for (const h of hay) if (h.includes(t)) score += 1;
    return { product: p, score };
  });
  const top = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 6);
  const out: SmartCartResult = {
    message: top.length ? `Top catalog matches for "${query}".` : `No catalog matches for "${query}".`,
    picks: [], outOfStock: [], notInCatalog: [], warnings: [], source: 'mock', language
  };
  for (const { product } of top) {
    const v = violatesPreferences(product, prefs);
    if (v) { out.warnings.push(v); continue; }
    if (classifyStock(product) === 'out_of_stock') {
      const sub = rankSubstitute(product, prefs);
      out.outOfStock.push({ product, substitute: sub?.product ?? null, substituteReason: sub?.reason });
      if (sub) out.picks.push({ product: sub.product, qty: 1, note: `substitute for ${product.brand}` });
    } else {
      out.picks.push({ product, qty: 1, status: classifyStock(product) });
    }
  }
  return out;
}
