import type { IntentResult } from '../types';
import { findRecipeByName, products } from '../dataAccess';
import { isBedrockEnabled, bedrockJSON } from '../aws/bedrockClient';

/**
 * Intent Understanding Agent
 * --------------------------------------------------------------
 * Hybrid resolution strategy:
 *
 *   1. Check recipe library  ("poha", "biryani", ...) — instant.
 *   2. Check rule library    (guests, baby, period, fever, ...).
 *   3. If Bedrock is configured, call Claude with a JSON schema
 *      and use the structured response.
 *   4. Otherwise, fall back to a semantic catalog search so the
 *      response is still relevant rather than the rule fallback
 *      that previously returned Lay's + milk for everything.
 *
 * The async API matches what UI calls; the sync helper exists for
 * unit tests and for the offline build.
 */

type Rule = {
  match: RegExp;
  intent_type: IntentResult['intent_type'];
  category: string;
  goal: string;
  urgency: number;
  dietary?: string[];
  constraints?: string[];
  cart_type: string;
  hinglish: string;
  suggested_questions?: string[];
};

const RULES: Rule[] = [
  {
    match: /(guest|mehmaan|aa rahe|aa rahi|coming).*?(min|hour|jaldi)?|guests/i,
    intent_type: 'emergency',
    category: 'guest_kit',
    goal: 'Welcome guests with snacks and drinks',
    urgency: 0.95,
    cart_type: 'guest_combo',
    hinglish: 'Got it. Guest-ready cart in 8 min.',
    suggested_questions: ['How many guests?', 'Veg or non-veg snacks?']
  },
  {
    match: /period|menstrual|periods|cramps|sanitary|pad(s)?\b|tampon|menses/i,
    intent_type: 'emergency',
    category: 'period',
    goal: 'Period care essentials',
    urgency: 0.95,
    cart_type: 'period_kit',
    hinglish: 'Period care kit ready. Discreet packaging on every order.',
    constraints: ['requires_caution']
  },
  {
    match: /vegan/i,
    intent_type: 'guided',
    category: 'vegan',
    goal: 'Find vegan-friendly products',
    urgency: 0.4,
    dietary: ['vegan'],
    cart_type: 'best_match',
    hinglish: 'Showing only 100% vegan SKUs.'
  },
  {
    match: /clean(ing)?|safai|saaf/i,
    intent_type: 'guided',
    category: 'cleaning',
    goal: 'Build a household cleaning kit',
    urgency: 0.5,
    cart_type: 'guided_kit',
    hinglish: 'Cleaning kit ready.'
  },
  {
    match: /baby|diaper|wipes|new parent|bachcha/i,
    intent_type: 'guided',
    category: 'baby',
    goal: 'Build a trusted baby essentials kit',
    urgency: 0.7,
    cart_type: 'guided_kit',
    hinglish: 'Baby essentials prepared.'
  },
  {
    match: /breakfast|nashta/i,
    intent_type: 'guided',
    category: 'breakfast',
    goal: 'Healthy breakfast in 10 minutes',
    urgency: 0.6,
    cart_type: 'best_match',
    hinglish: 'Healthy breakfast options.'
  },
  {
    match: /pooja|prasad|aarti|hawan/i,
    intent_type: 'emergency',
    category: 'pooja',
    goal: 'Pooja essentials',
    urgency: 0.85,
    cart_type: 'guided_kit',
    hinglish: 'Pooja samaan ready by tomorrow.'
  },
  {
    match: /protein|gym|workout|fitness/i,
    intent_type: 'guided',
    category: 'high-protein',
    goal: 'High protein snacks',
    urgency: 0.4,
    constraints: ['high-protein'],
    cart_type: 'best_match',
    hinglish: 'Showing 15g+ protein options.'
  },
  {
    match: /hostel|college/i,
    intent_type: 'guided',
    category: 'hostel',
    goal: 'College hostel survival kit',
    urgency: 0.6,
    cart_type: 'guided_kit',
    hinglish: 'Hostel kit ready.'
  },
  {
    match: /rain|barish|baarish|umbrella/i,
    intent_type: 'emergency',
    category: 'rainy',
    goal: 'Rainy day comfort kit',
    urgency: 0.8,
    cart_type: 'guided_kit',
    hinglish: 'Rainy day kit ready.'
  },
  {
    match: /power cut|bijli|light gayi|inverter/i,
    intent_type: 'emergency',
    category: 'power_cut',
    goal: 'Power cut backup essentials',
    urgency: 0.9,
    cart_type: 'guided_kit',
    hinglish: 'Backup ready.'
  },
  {
    match: /fever|bukhar|sick|tabiyat|paracetamol|dolo|cold/i,
    intent_type: 'emergency',
    category: 'wellness',
    goal: 'Fever care basics',
    urgency: 0.95,
    cart_type: 'guided_kit',
    hinglish: 'Fever basics. Consult a doctor if symptoms persist.',
    constraints: ['requires_caution']
  }
];

function ruleMatch(text: string): IntentResult | null {
  for (const rule of RULES) {
    if (rule.match.test(text)) {
      return {
        raw_input: text,
        intent_type: rule.intent_type,
        category: rule.category,
        goal: rule.goal,
        urgency_score: rule.urgency,
        constraints: rule.constraints ?? [],
        dietary: rule.dietary ?? [],
        cart_type: rule.cart_type,
        hinglish_response: rule.hinglish,
        suggested_questions: rule.suggested_questions ?? []
      };
    }
  }
  return null;
}

/**
 * Sync resolver — used by build-time, tests, and as the offline
 * fallback when Bedrock is not configured.
 */
export function understandIntent(input: string): IntentResult {
  const text = input.trim();

  // 1) Recipe / cooking intent
  const recipe = findRecipeByName(text);
  if (recipe) {
    return {
      raw_input: text,
      intent_type: 'guided',
      category: 'recipe:' + recipe.id,
      goal: recipe.intent_hint,
      urgency_score: 0.55,
      constraints: [],
      dietary: [],
      cart_type: 'recipe_kit',
      hinglish_response: `Got it. ${recipe.label} ke saare ingredients ek saath.`,
      suggested_questions: []
    };
  }

  // 2) Rules
  const ruled = ruleMatch(text);
  if (ruled) return ruled;

  // 3) Catalog semantic fallback (offline, deterministic)
  const tokens = tokenize(text);
  const matchedCategory = inferCategoryFromTokens(tokens);
  return {
    raw_input: text,
    intent_type: 'general',
    category: matchedCategory ?? 'general',
    goal: matchedCategory ? `Find best ${matchedCategory} options for "${text}"` : `Show best matches for "${text}"`,
    urgency_score: 0.3,
    constraints: [],
    dietary: [],
    cart_type: 'best_match',
    hinglish_response: matchedCategory
      ? `Showing top ${matchedCategory} matches for your need.`
      : `Showing best matches for "${text}".`,
    suggested_questions: []
  };
}

/**
 * Async resolver — UI calls this. Uses Bedrock when available so
 * free-form queries like "I want to make biryani for 6 people" or
 * "kal mom aa rahi hai" are handled without rules.
 */
export async function understandIntentAsync(input: string): Promise<IntentResult> {
  const text = input.trim();

  // Recipe + rule shortcuts (fast path, no token cost)
  const recipe = findRecipeByName(text);
  if (recipe) return understandIntent(text);
  const ruled = ruleMatch(text);
  if (ruled) return ruled;

  // Bedrock structured output
  if (isBedrockEnabled()) {
    try {
      const sys = `You are the Amazon Pulse Now intent classifier for an India-first quick-commerce app.
You must categorise a customer's free-form need (English or Hinglish) into a strict JSON object.

Allowed intent_type values: emergency | guided | predictive | reorder | general.
Allowed top-level category values include: guest_kit, period, baby, cleaning, vegan, breakfast, pooja, high-protein, hostel, rainy, power_cut, wellness, dairy, snacks, beverages, staples, produce, spices, recipe (for cooking), general.

Return JSON with these keys:
- intent_type
- category
- goal: one short imperative sentence describing what to build
- urgency_score: number 0..1
- constraints: array of strings (e.g. "requires_caution" for medicine)
- dietary: array of strings from ["vegan","vegetarian","high-protein","gluten-free","lactose-free"] only
- cart_type: one of best_match | guest_combo | period_kit | guided_kit | recipe_kit | trusted_repeat
- hinglish_response: one short friendly sentence in English/Hinglish summarising what you understood
- suggested_questions: array of 0-2 short clarifying questions`;

      const result = await bedrockJSON<Omit<IntentResult, 'raw_input'>>(sys, text, {
        maxTokens: 350,
        temperature: 0.2
      });
      return { raw_input: text, ...result } as IntentResult;
    } catch (e) {
      // fall through to offline
    }
  }

  return understandIntent(text);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function inferCategoryFromTokens(tokens: string[]): string | null {
  const counts: Record<string, number> = {};
  for (const p of products) {
    const tags = [...p.tags, ...p.dietary_tags, p.category, p.brand.toLowerCase()];
    for (const t of tokens) {
      if (tags.some((x) => x.toLowerCase() === t || x.toLowerCase().includes(t))) {
        counts[p.category] = (counts[p.category] ?? 0) + 1;
      }
    }
  }
  let best: string | null = null;
  let max = 0;
  for (const [cat, c] of Object.entries(counts)) {
    if (c > max) {
      max = c;
      best = cat;
    }
  }
  return max >= 1 ? best : null;
}
