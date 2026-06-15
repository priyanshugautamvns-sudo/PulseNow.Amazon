/**
 * Lightweight language detector for Pulse Now.
 * Output values are limited to: english | hindi | hinglish.
 */

export type Lang = 'english' | 'hindi' | 'hinglish';

// Common Roman-Hindi tokens (Hinglish indicators)
const HINGLISH_TOKENS = [
  'mujhe', 'chahiye', 'jaldi', 'jaldii', 'ghar', 'pe', 'aa', 'rahe',
  'rahi', 'rha', 'aaj', 'kal', 'pooja', 'samaan', 'doodh', 'chai',
  'pakode', 'snacks', 'bana', 'bana do', 'kar do', 'bhej', 'bhej do',
  'khatam', 'kitne', 'kitni', 'meri', 'mera', 'apna', 'apni',
  'thoda', 'thodi', 'safai', 'saaf', 'mehmaan', 'guests aa rahe',
  'bukhar', 'tabiyat', 'paani', 'sabzi', 'roti', 'dal', 'baby ke',
  'bachcha', 'bachhe', 'naye', 'wala', 'wali', 'achha', 'achhi',
  'kya', 'hai', 'hain', 'nahi', 'nahin', 'jaye', 'jayega', 'jayegi'
];

export function detectLanguage(text: string): Lang {
  const t = (text ?? '').trim();
  if (!t) return 'english';

  // Devanagari character range -> Hindi
  if (/[\u0900-\u097F]/.test(t)) return 'hindi';

  const lower = t.toLowerCase();
  let hits = 0;
  for (const tok of HINGLISH_TOKENS) {
    if (new RegExp(`\\b${tok}\\b`).test(lower)) hits += 1;
    if (hits >= 1) break;
  }
  return hits > 0 ? 'hinglish' : 'english';
}

/** A tiny phrase-pack for status strings shown during AI calls. */
export const STATUS_STRINGS: Record<Lang, Record<string, string>> = {
  english: {
    listening: 'Listening',
    thinking: 'Pulse is thinking',
    matching: 'Matching catalog',
    checking: 'Checking stock',
    building: 'Building cart',
    ready: 'Ready'
  },
  hindi: {
    listening: 'सुन रहा हूँ',
    thinking: 'सोच रहा हूँ',
    matching: 'कैटलॉग से मिलान',
    checking: 'स्टॉक देख रहा हूँ',
    building: 'कार्ट बना रहा हूँ',
    ready: 'तैयार'
  },
  hinglish: {
    listening: 'Sun raha hoon',
    thinking: 'Soch raha hoon',
    matching: 'Catalog match kar raha hoon',
    checking: 'Stock check kar raha hoon',
    building: 'Cart bana raha hoon',
    ready: 'Tayyar'
  }
};
