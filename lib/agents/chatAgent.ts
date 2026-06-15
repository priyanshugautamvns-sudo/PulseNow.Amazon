import { products, findRecipeByName, getProductById } from '../dataAccess';
import { isBedrockEnabled, bedrockChat, bedrockJSON, ALLOW_MOCK, aiConfigError, getModelId } from '../aws/bedrockClient';
import { detectLanguage } from './language';
import type { Product } from '../types';

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

export type ChatReply = {
  message: string;
  picks: { product: Product; qty: number; note?: string }[];
  outOfStock?: { product: Product; substitute?: Product | null }[];
  notInCatalog?: { name: string; reason?: string }[];
  warnings?: string[];
  source: 'bedrock' | 'recipe' | 'mock';
  language?: 'english' | 'hindi' | 'hinglish';
  error?: string;
};

function catalogSummary(): string {
  return products
    .map(
      (p) =>
        `${p.id} | ${p.name} | ${p.category} | ${p.brand} | ₹${p.price} | tags: ${[...p.tags, ...p.dietary_tags].slice(0, 6).join(', ')} | stock: ${p.stock_count <= 0 ? 'OUT' : p.stock_count < 10 ? 'LOW' : 'OK'}`
    )
    .join('\n');
}

const SYSTEM_PROMPT = `You are Pulse, the in-app AI shopping assistant for Amazon Now (India).
Help customers go from a need to a confident cart in seconds.

LANGUAGE RULE (very important):
- Detect the user's language: english | hindi | hinglish.
- ALWAYS respond in the SAME language as the user's input. Match script (Roman for Hinglish, Devanagari for Hindi).
- If preferences specify a language, use it ONLY when the user input itself doesn't reveal a language.

PRODUCT RULES:
1. Recommend ONLY products from the catalog provided. NEVER invent product_ids.
2. If a needed item is not in the catalog, list it under notInCatalog.
3. Out-of-stock products go in outOfStock. Suggest a substitute only if it matches the original intent + dietary preferences.
4. Respect dietary, health, and brand preferences.
5. For wellness items, add a one-line consult-a-doctor note. Never give medical advice.

Catalog (id | name | category | brand | price | tags | stock):
${catalogSummary()}`;

type LLMOut = {
  message: string;
  picks: { product_id: string; qty: number; note?: string }[];
  outOfStock?: { product_id: string; substitute_id?: string | null }[];
  notInCatalog?: { name: string; reason?: string }[];
  warnings?: string[];
  language?: 'english' | 'hindi' | 'hinglish';
};

export async function chatRespond(history: ChatTurn[], userMessage: string, preferences?: any): Promise<ChatReply> {
  // Recipe shortcut keeps quality predictable for known dishes.
  const recipe = findRecipeByName(userMessage);
  if (recipe) {
    const picks = recipe.ingredients
      .map((i) => {
        const product = getProductById(i.product_id);
        return product ? { product, qty: i.qty ?? 1, note: i.note } : null;
      })
      .filter(Boolean) as { product: Product; qty: number; note?: string }[];
    return {
      message: `Here is everything you need for ${recipe.label}.`,
      picks,
      source: 'recipe',
      language: detectLanguage(userMessage)
    };
  }

  const cfgError = aiConfigError();
  if (cfgError) {
    if (!ALLOW_MOCK) {
      return { message: cfgError, picks: [], source: 'mock', error: cfgError };
    }
    return offlineFallback(userMessage);
  }

  if (isBedrockEnabled()) {
    try {
      const language = detectLanguage(userMessage);
      const sys =
        SYSTEM_PROMPT +
        '\n\nUSER PREFERENCES:\n' +
        JSON.stringify(preferences ?? {}) +
        `\n\nDETECTED INPUT LANGUAGE: ${language}\nYou must respond in ${language}.`;
      const userPrompt = renderHistory(history, userMessage) +
        `\n\nReturn JSON: { "message": string, "language": "${language}", "picks": [{ "product_id": string, "qty": number, "note": string }], "outOfStock": [...], "notInCatalog": [...], "warnings": [...] }`;
      const json = await bedrockJSON<LLMOut>(sys, userPrompt, { maxTokens: 800, temperature: 0.3 });

      const picks: ChatReply['picks'] = [];
      const outOfStock: ChatReply['outOfStock'] = [];
      const notInCatalog: ChatReply['notInCatalog'] = json.notInCatalog ?? [];

      for (const row of json.picks ?? []) {
        const product = getProductById(row.product_id);
        if (!product) {
          notInCatalog.push({ name: row.product_id, reason: 'AI suggested an ID not in catalog' });
          continue;
        }
        if (product.stock_count <= 0) {
          const sub = (product.substitutes ?? []).map(getProductById).find((p): p is Product => !!p && p.stock_count > 0) ?? null;
          outOfStock.push({ product, substitute: sub });
          if (sub) picks.push({ product: sub, qty: row.qty || 1, note: `substitute for ${product.brand}` });
          continue;
        }
        picks.push({ product, qty: row.qty || 1, note: row.note });
      }

      for (const row of json.outOfStock ?? []) {
        const product = getProductById(row.product_id);
        if (!product) continue;
        const sub = row.substitute_id ? getProductById(row.substitute_id) ?? null : null;
        outOfStock.push({ product, substitute: sub });
      }

      return {
        message: json.message ?? '',
        picks,
        outOfStock,
        notInCatalog,
        warnings: json.warnings ?? [],
        language,
        source: 'bedrock'
      };
    } catch (e: any) {
      console.error('[chatAgent] Bedrock error:', e?.message ?? e);
      if (!ALLOW_MOCK) {
        return {
          message: humaniseError(e),
          picks: [],
          source: 'mock',
          error: e?.message ?? 'AI call failed'
        };
      }
      return offlineFallback(userMessage);
    }
  }
  return ALLOW_MOCK ? offlineFallback(userMessage) : { message: 'AI is not configured.', picks: [], source: 'mock', error: 'AI disabled' };
}

export async function chatProseOnly(history: ChatTurn[], userMessage: string): Promise<string> {
  if (!isBedrockEnabled()) return offlineFallback(userMessage).message;
  try {
    return await bedrockChat(
      'You are Pulse, Amazon Now\'s shopping assistant. Reply in 1-3 short, warm sentences.',
      [...history, { role: 'user', content: userMessage }],
      { maxTokens: 200, temperature: 0.4 }
    );
  } catch {
    return ALLOW_MOCK ? offlineFallback(userMessage).message : 'AI request failed. Please try again.';
  }
}

function renderHistory(history: ChatTurn[], userMessage: string): string {
  const lines = history.map((t) => `${t.role.toUpperCase()}: ${t.content}`);
  lines.push(`USER: ${userMessage}`);
  return lines.join('\n');
}

function humaniseError(e: any): string {
  const msg = String(e?.message ?? e);
  if (/AccessDenied/i.test(msg)) return 'AI access is not enabled for this Bedrock model in your AWS account. Open the Bedrock console → Model access → grant Anthropic Claude Sonnet 4.5 (or your chosen model).';
  if (/ValidationException/i.test(msg)) return 'AI request was rejected by Bedrock. Check the model id and region in .env.local.';
  if (/Throttling/i.test(msg)) return 'AI is rate-limiting requests. Try again in a moment.';
  if (/ResourceNotFound/i.test(msg)) return 'Bedrock model not found in this region. Check BEDROCK_MODEL_ID and AWS_REGION.';
  return 'AI request failed: ' + msg;
}

function offlineFallback(userMessage: string): ChatReply {
  const tokens = userMessage.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
  const scored = products.map((p) => {
    const hay = [...p.tags, ...p.dietary_tags, p.category, p.brand, p.name].map((s) => s.toLowerCase());
    let score = 0;
    for (const t of tokens) for (const h of hay) if (h.includes(t)) score += 1;
    return { product: p, score };
  });
  const picks = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 5).map((s) => ({ product: s.product, qty: 1 }));
  return {
    message: picks.length ? `Catalog matches for "${userMessage}".` : `No catalog matches for "${userMessage}".`,
    picks,
    source: 'mock',
    language: detectLanguage(userMessage)
  };
}

export function aiAvailability() {
  const cfg = aiConfigError();
  return {
    bedrock_enabled: isBedrockEnabled(),
    model: getModelId(),
    mock_allowed: ALLOW_MOCK,
    config_error: cfg
  };
}
