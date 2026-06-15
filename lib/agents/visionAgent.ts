import { products, getProductById } from '../dataAccess';
import { isBedrockEnabled, bedrockVisionJSON, bedrockJSON, ALLOW_MOCK, aiConfigError } from '../aws/bedrockClient';
import type { Product } from '../types';

export type VisionListResult = {
  raw_lines: string[];
  matches: { line: string; product: Product; confidence: number }[];
  notInCatalog: { line: string; reason?: string }[];
  source: 'bedrock' | 'mock';
  error?: string;
};

export type VisionProductResult = {
  detected: string;
  product: Product | null;
  confidence: number;
  note: string;
  notInCatalog?: { name: string; reason?: string };
  source: 'bedrock' | 'mock';
  error?: string;
};

const LIST_SYSTEM = `You are Pulse Vision. You receive an image of a handwritten or printed shopping list and must extract each line item.

Rules:
- Output STRICT JSON only.
- Match each line to a product_id from the catalog where confident.
- If no good catalog match exists, put the line in notInCatalog (do not invent product_id).

Schema:
{
  "raw_lines": ["string", ...],
  "matches": [{ "line": "string", "product_id": "string", "confidence": number }],
  "notInCatalog": [{ "line": "string", "reason": "string" }]
}`;

const PRODUCT_SYSTEM = `You are Pulse Vision. You receive an image of a product or empty packet and must identify it.

Rules:
- Output STRICT JSON only.
- Identify the product/category. Match to a product_id from the catalog when confident.
- If you cannot match to the catalog, set product_id to null and add a notInCatalog object describing what you saw.

Schema:
{
  "detected": "string (what you see)",
  "product_id": "string | null",
  "confidence": number,
  "note": "string (one-line rationale)",
  "notInCatalog": null | { "name": "string", "reason": "string" }
}`;

function catalogPrompt(): string {
  return products
    .map((p) => `${p.id} | ${p.name} | ${p.category} | ${p.brand} | tags: ${[...p.tags, ...p.dietary_tags].slice(0, 5).join(', ')}`)
    .join('\n');
}

type LLMListOut = {
  raw_lines: string[];
  matches: { line: string; product_id: string; confidence: number }[];
  notInCatalog: { line: string; reason?: string }[];
};

type LLMProductOut = {
  detected: string;
  product_id: string | null;
  confidence: number;
  note: string;
  notInCatalog: null | { name: string; reason?: string };
};

export async function scanListVision(dataUrl: string): Promise<VisionListResult> {
  const cfgError = aiConfigError();
  if (cfgError && !ALLOW_MOCK) {
    return { raw_lines: [], matches: [], notInCatalog: [], source: 'mock', error: cfgError };
  }
  if (isBedrockEnabled()) {
    try {
      const out = await bedrockVisionJSON<LLMListOut>(
        LIST_SYSTEM + '\n\nCATALOG:\n' + catalogPrompt(),
        'Extract each line of this handwritten shopping list and match to catalog.',
        dataUrl,
        { maxTokens: 900, temperature: 0.2 }
      );
      const matches: VisionListResult['matches'] = [];
      const notInCatalog: VisionListResult['notInCatalog'] = out.notInCatalog ?? [];
      for (const m of out.matches ?? []) {
        const product = getProductById(m.product_id);
        if (!product) {
          notInCatalog.push({ line: m.line, reason: `AI suggested an ID not in catalog (${m.product_id})` });
          continue;
        }
        matches.push({ line: m.line, product, confidence: m.confidence ?? 0.85 });
      }
      return { raw_lines: out.raw_lines ?? [], matches, notInCatalog, source: 'bedrock' };
    } catch (e: any) {
      console.error('[visionAgent.list] Bedrock error:', e?.message ?? e);
      if (!ALLOW_MOCK) {
        return {
          raw_lines: [],
          matches: [],
          notInCatalog: [],
          source: 'mock',
          error: e?.message ?? 'Image could not be read. Try a clearer photo or upload another image.'
        };
      }
    }
  }
  return mockListResult();
}

export async function scanProductVision(dataUrl: string): Promise<VisionProductResult> {
  const cfgError = aiConfigError();
  if (cfgError && !ALLOW_MOCK) {
    return { detected: '', product: null, confidence: 0, note: '', source: 'mock', error: cfgError };
  }
  if (isBedrockEnabled()) {
    try {
      const out = await bedrockVisionJSON<LLMProductOut>(
        PRODUCT_SYSTEM + '\n\nCATALOG:\n' + catalogPrompt(),
        'Identify this product/empty packet and match to catalog if possible.',
        dataUrl,
        { maxTokens: 400, temperature: 0.15 }
      );
      const product = out.product_id ? getProductById(out.product_id) ?? null : null;
      return {
        detected: out.detected ?? 'unknown',
        product,
        confidence: out.confidence ?? 0.7,
        note: out.note ?? '',
        notInCatalog: out.notInCatalog ?? (out.product_id && !product ? { name: out.detected, reason: 'AI suggested ID not in catalog' } : undefined),
        source: 'bedrock'
      };
    } catch (e: any) {
      console.error('[visionAgent.product] Bedrock error:', e?.message ?? e);
      if (!ALLOW_MOCK) {
        return {
          detected: '',
          product: null,
          confidence: 0,
          note: '',
          source: 'mock',
          error: e?.message ?? 'Image could not be read. Try a clearer photo or upload another image.'
        };
      }
    }
  }
  return mockProductResult();
}

/* ---------- voice-note transcription + intent extraction ---------- */

export type VoiceNoteResult = {
  transcript: string;
  language: 'english' | 'hindi' | 'hinglish';
  picks: { product: Product; qty: number; note?: string }[];
  notInCatalog: { name: string; reason?: string }[];
  outOfStock: { product: Product; substitute?: Product | null }[];
  message: string;
  source: 'bedrock' | 'mock';
  error?: string;
};

const VOICE_SYSTEM = `You are Pulse, processing a customer's voice note (transcribed text) into a shopping cart.

LANGUAGE RULE: Respond in the SAME language as the transcript. Detect english | hindi | hinglish.

PRODUCT RULES:
- Output STRICT JSON only.
- Choose products by id from the catalog. Never invent.
- Items not in catalog go in notInCatalog.

Schema:
{
  "language": "english | hindi | hinglish",
  "message": "string (1-2 friendly sentences in detected language)",
  "picks": [{ "product_id": "string", "qty": number, "note": "string" }],
  "notInCatalog": [{ "name": "string", "reason": "string" }]
}`;

/**
 * Voice note pipeline.
 * --------------------------------------------------------------
 * Production: Amazon Transcribe → Claude Sonnet.
 * Prototype: we accept either a pre-transcribed `transcript` field
 * (set by the client / a sample voice note) and run only the second
 * stage. This keeps the demo deterministic without a real Transcribe
 * subscription.
 */
export async function processVoiceNote(transcript: string, prefs?: any): Promise<VoiceNoteResult> {
  if (!transcript) {
    return { transcript: '', language: 'english', picks: [], notInCatalog: [], outOfStock: [], message: 'Empty transcript.', source: 'mock', error: 'no transcript' };
  }
  const cfgError = aiConfigError();
  if (cfgError && !ALLOW_MOCK) {
    return { transcript, language: 'english', picks: [], notInCatalog: [], outOfStock: [], message: cfgError, source: 'mock', error: cfgError };
  }

  if (isBedrockEnabled()) {
    try {
      type LLMOut = {
        language: 'english' | 'hindi' | 'hinglish';
        message: string;
        picks: { product_id: string; qty: number; note?: string }[];
        notInCatalog: { name: string; reason?: string }[];
      };
      const sys =
        VOICE_SYSTEM +
        '\n\nUSER PREFERENCES:\n' + JSON.stringify(prefs ?? {}) +
        '\n\nCATALOG (id | name | category | brand | tags):\n' +
        products.map((p) => `${p.id} | ${p.name} | ${p.category} | ${p.brand} | tags: ${p.tags.slice(0, 5).join(', ')}`).join('\n');

      const out = await bedrockJSON<LLMOut>(sys, `TRANSCRIPT: ${transcript}`, { maxTokens: 700, temperature: 0.2 });
      const picks: VoiceNoteResult['picks'] = [];
      const notInCatalog: VoiceNoteResult['notInCatalog'] = out.notInCatalog ?? [];
      const outOfStock: VoiceNoteResult['outOfStock'] = [];
      for (const row of out.picks ?? []) {
        const product = getProductById(row.product_id);
        if (!product) { notInCatalog.push({ name: row.product_id, reason: 'AI suggested an id not in catalog' }); continue; }
        if (product.stock_count <= 0) {
          const sub = (product.substitutes ?? []).map(getProductById).find((p): p is Product => !!p && p.stock_count > 0) ?? null;
          outOfStock.push({ product, substitute: sub });
          if (sub) picks.push({ product: sub, qty: row.qty || 1, note: `substitute for ${product.brand}` });
          continue;
        }
        picks.push({ product, qty: row.qty || 1, note: row.note });
      }
      return {
        transcript,
        language: out.language ?? 'english',
        picks,
        notInCatalog,
        outOfStock,
        message: out.message ?? 'Voice note processed.',
        source: 'bedrock'
      };
    } catch (e: any) {
      console.error('[visionAgent.voice] Bedrock error:', e?.message ?? e);
      if (!ALLOW_MOCK) {
        return { transcript, language: 'english', picks: [], notInCatalog: [], outOfStock: [], message: 'AI request failed', source: 'mock', error: e?.message ?? 'AI failed' };
      }
    }
  }
  return mockVoiceResult(transcript);
}

/* ---------- mocks for back-compat keys ---------- */

export const SAMPLE_LIST_KEYS = ['sample_list_priya', 'sample_list_kitchen'] as const;
export const SAMPLE_PACKET_KEYS = ['maggi_packet', 'milk_packet', 'detergent_packet', 'shampoo_bottle'] as const;

const LIST_MOCKS: Record<string, { lines: string[]; ids: { line: string; id: string; conf: number }[] }> = {
  sample_list_priya: {
    lines: ['Milk', 'Bread', 'Eggs', 'Paneer', 'Vim liquid', 'Lays chips'],
    ids: [
      { line: 'Milk', id: 'p_milk_amul_1l', conf: 0.97 },
      { line: 'Bread', id: 'p_bread_brown', conf: 0.94 },
      { line: 'Eggs', id: 'p_eggs_brown_6', conf: 0.92 },
      { line: 'Paneer', id: 'p_paneer_amul_200', conf: 0.91 },
      { line: 'Vim liquid', id: 'p_dish_vim_750', conf: 0.88 },
      { line: 'Lays chips', id: 'p_chips_lays_classic', conf: 0.93 }
    ]
  },
  sample_list_kitchen: {
    lines: ['Toor dal 1kg', 'Basmati rice', 'Curd', 'Bread', 'Oats'],
    ids: [
      { line: 'Toor dal 1kg', id: 'p_dal_toor_1kg', conf: 0.95 },
      { line: 'Basmati rice', id: 'p_rice_basmati_5kg', conf: 0.9 },
      { line: 'Curd', id: 'p_curd_amul_400', conf: 0.93 },
      { line: 'Bread', id: 'p_bread_brown', conf: 0.92 },
      { line: 'Oats', id: 'p_breakfast_oats_bagrry', conf: 0.91 }
    ]
  }
};

const PRODUCT_MOCKS: Record<string, { detected: string; id: string; conf: number; note: string }> = {
  maggi_packet: { detected: 'Maggi 2-Min Masala Noodles', id: 'p_maggi_12pack', conf: 0.96, note: 'Recognised yellow Maggi pack outline.' },
  milk_packet: { detected: 'Amul Taaza Toned Milk', id: 'p_milk_amul_1l', conf: 0.94, note: 'Detected blue Amul Taaza pouch.' },
  detergent_packet: { detected: 'Vim Dishwash Liquid', id: 'p_dish_vim_750', conf: 0.9, note: 'Detected green Vim bottle.' },
  shampoo_bottle: { detected: 'Mamaearth bottle', id: 'p_baby_detergent_mama', conf: 0.84, note: 'Detected logo shape.' }
};

export function scanList(key: string) {
  const m = LIST_MOCKS[key];
  if (!m) return null;
  const matches = m.ids
    .map((row) => {
      const product = getProductById(row.id);
      return product ? { line: row.line, product, confidence: row.conf } : null;
    })
    .filter(Boolean) as { line: string; product: Product; confidence: number }[];
  return { raw_lines: m.lines, matches };
}

export function scanProduct(key: string) {
  const m = PRODUCT_MOCKS[key];
  if (!m) return null;
  const product = getProductById(m.id);
  return { detected: m.detected, product, confidence: m.conf, note: m.note };
}

function mockListResult(): VisionListResult {
  return {
    raw_lines: ['(Pulse Vision unavailable — showing demo data)', 'Milk', 'Bread', 'Eggs'],
    matches: [
      { line: 'Milk', product: getProductById('p_milk_amul_1l')!, confidence: 0.9 },
      { line: 'Bread', product: getProductById('p_bread_brown')!, confidence: 0.88 },
      { line: 'Eggs', product: getProductById('p_eggs_brown_6')!, confidence: 0.86 }
    ].filter((m) => m.product),
    notInCatalog: [],
    source: 'mock'
  };
}

function mockProductResult(): VisionProductResult {
  return {
    detected: 'Demo product',
    product: getProductById('p_maggi_12pack') ?? null,
    confidence: 0.85,
    note: 'Pulse Vision unavailable — showing demo match.',
    source: 'mock'
  };
}

function mockVoiceResult(transcript: string): VoiceNoteResult {
  return {
    transcript,
    language: 'english',
    picks: [],
    notInCatalog: [],
    outOfStock: [],
    message: '(Mock) AI not configured. No items extracted.',
    source: 'mock'
  };
}
