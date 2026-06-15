import { products, getProductById } from '../dataAccess';
import { isBedrockEnabled, bedrockJSON } from '../aws/bedrockClient';
import type { Product } from '../types';

export type GuidedTurn = { role: 'assistant' | 'user'; content: string; options?: string[] };

export type GuidedStep =
  | { kind: 'question'; question: string; options: string[] }
  | {
      kind: 'cart';
      message: string;
      picks: { product: Product; qty: number; note?: string }[];
      notInCatalog: { name: string; reason?: string }[];
      outOfStock: { product: Product; substitute?: Product | null }[];
    };

const SYSTEM = `You are Pulse, the guided-shopping AI inside Amazon Now (India).
Take a customer's goal, ask 1 tailored multiple-choice question per turn (max 3 total), then produce a final shopping kit drawn ONLY from the catalog provided.

Rules:
- Speak in clean, friendly English (Hinglish accepted).
- Each question narrows the kit (size, dietary, brand, budget).
- 3-5 short option labels, never free text.
- Never invent product IDs. If you think a needed item isn't in catalog, list it under notInCatalog with a plain item name.
- For wellness items, include a "consult a doctor" note in the closing message.

Reply schema (strict JSON, no prose, no markdown fences):

If you need more info:
  { "kind": "question", "question": "string", "options": ["..."] }

If the kit is ready:
  { "kind": "cart",
    "message": "string",
    "picks": [{ "product_id": "string", "qty": number, "note": "string?" }],
    "notInCatalog": [{ "name": "string", "reason": "string?" }] }
`;

function catalogSummary(): string {
  return products
    .map((p) => `${p.id} | ${p.name} | ${p.category} | ${p.brand} | ₹${p.price} | tags: ${[...p.tags, ...p.dietary_tags].slice(0, 6).join(', ')} | stock: ${p.stock_count <= 0 ? 'OUT' : p.stock_count < 10 ? 'LOW' : 'OK'}`)
    .join('\n');
}

type LLMOut =
  | { kind: 'question'; question: string; options: string[] }
  | {
      kind: 'cart';
      message: string;
      picks: { product_id: string; qty: number; note?: string }[];
      notInCatalog?: { name: string; reason?: string }[];
    };

function classifyStock(p: Product) {
  if (p.stock_count <= 0) return 'out_of_stock' as const;
  if (p.stock_count < 10) return 'low_stock' as const;
  return 'available' as const;
}

function findSubstitute(p: Product): Product | null {
  for (const sid of p.substitutes ?? []) {
    const sub = getProductById(sid);
    if (sub && classifyStock(sub) !== 'out_of_stock') return sub;
  }
  return products.find((q) => q.id !== p.id && q.category === p.category && classifyStock(q) !== 'out_of_stock') ?? null;
}

export async function guidedNextStep(goal: string, history: GuidedTurn[], preferences?: any): Promise<GuidedStep> {
  const userTurns = history.filter((t) => t.role === 'user').length;
  const forceCart = userTurns >= 3;

  if (isBedrockEnabled()) {
    try {
      const sys =
        SYSTEM +
        '\n\nUSER PREFERENCES:\n' + JSON.stringify(preferences ?? {}) +
        '\n\nCATALOG (id | name | category | brand | price | tags | stock):\n' + catalogSummary();
      const userPrompt =
        `GOAL: ${goal}\n` +
        `HISTORY (${userTurns} answers so far): ${JSON.stringify(history.slice(-8))}\n` +
        (forceCart
          ? `You MUST return kind="cart" now. Do not ask any more questions.`
          : `Decide whether to ask another question or produce the cart now. After 3 user answers you must return kind="cart".`);
      const out = await bedrockJSON<LLMOut>(sys, userPrompt, { maxTokens: 800, temperature: 0.3 });
      if (forceCart && out.kind === 'question') return offlineCart(goal, history);
      return normalize(out);
    } catch {
      // fall through
    }
  }
  return offlineFallback(goal, history);
}

function normalize(out: LLMOut): GuidedStep {
  if (out.kind === 'question') {
    return { kind: 'question', question: out.question, options: (out.options ?? []).slice(0, 5) };
  }
  const picks: { product: Product; qty: number; note?: string }[] = [];
  const notInCatalog: { name: string; reason?: string }[] = out.notInCatalog ?? [];
  const outOfStock: { product: Product; substitute?: Product | null }[] = [];

  for (const p of out.picks ?? []) {
    const product = getProductById(p.product_id);
    if (!product) {
      notInCatalog.push({ name: p.product_id, reason: 'AI suggested an ID not in catalog' });
      continue;
    }
    const status = classifyStock(product);
    if (status === 'out_of_stock') {
      const sub = findSubstitute(product);
      outOfStock.push({ product, substitute: sub });
      if (sub) picks.push({ product: sub, qty: p.qty || 1, note: `substitute for ${product.brand}` });
    } else {
      picks.push({ product, qty: p.qty || 1, note: p.note });
    }
  }
  return { kind: 'cart', message: out.message ?? 'Here is your kit.', picks, notInCatalog, outOfStock };
}

function offlineFallback(goal: string, history: GuidedTurn[]): GuidedStep {
  const turns = history.length;
  const g = goal.toLowerCase();
  if (turns === 0) {
    if (g.includes('parent') || g.includes('baby')) return { kind: 'question', question: 'Baby age?', options: ['0-3 months', '3-6 months', '6-12 months', '12+ months'] };
    if (g.includes('hostel') || g.includes('college')) return { kind: 'question', question: 'Cooking allowed?', options: ['Yes', 'No, kettle only'] };
    if (g.includes('vegan')) return { kind: 'question', question: 'What kind of vegan picks?', options: ['Snacks', 'Breakfast', 'Drinks', 'All three'] };
    if (g.includes('clean')) return { kind: 'question', question: 'Home size?', options: ['1BHK', '2BHK', '3BHK+'] };
    if (g.includes('protein')) return { kind: 'question', question: 'Pick your style', options: ['Vegan', 'Vegetarian', 'Eggs ok'] };
    return { kind: 'question', question: 'What is your priority?', options: ['Speed', 'Premium picks', 'Value for money'] };
  }
  return offlineCart(goal, history);
}

function offlineCart(goal: string, _history: GuidedTurn[]): GuidedStep {
  const g = goal.toLowerCase();
  const ids: string[] = [];
  if (g.includes('parent') || g.includes('baby')) ids.push('p_diapers_pampers_m', 'p_wipes_pampers', 'p_baby_lotion_johnsons', 'p_thermometer_digital');
  else if (g.includes('hostel')) ids.push('p_maggi_12pack', 'p_breakfast_oats_bagrry', 'p_breakfast_peanut_butter', 'p_paracetamol_dolo', 'p_powerbank_mi');
  else if (g.includes('vegan')) ids.push('p_vegan_snack_box', 'p_vegan_chips', 'p_vegan_milk_oat');
  else if (g.includes('clean')) ids.push('p_floor_cleaner_lizol', 'p_dish_vim_750', 'p_toilet_harpic', 'p_glass_cleaner_colin', 'p_microfiber_cloth_5');
  else if (g.includes('protein')) ids.push('p_breakfast_peanut_butter', 'p_breakfast_muesli_yog', 'p_vegan_snack_box', 'p_eggs_brown_6');
  else ids.push('p_maggi_12pack', 'p_milk_amul_1l', 'p_bread_brown');

  const picks: { product: Product; qty: number; note?: string }[] = [];
  const outOfStock: { product: Product; substitute?: Product | null }[] = [];
  for (const id of ids) {
    const p = getProductById(id);
    if (!p) continue;
    if (classifyStock(p) === 'out_of_stock') {
      const sub = findSubstitute(p);
      outOfStock.push({ product: p, substitute: sub });
      if (sub) picks.push({ product: sub, qty: 1, note: `substitute for ${p.brand}` });
    } else {
      picks.push({ product: p, qty: 1 });
    }
  }
  return { kind: 'cart', message: 'Here is a starter kit.', picks, notInCatalog: [], outOfStock };
}
