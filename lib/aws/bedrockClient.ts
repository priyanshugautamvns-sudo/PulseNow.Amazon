/**
 * Bedrock client — Claude Sonnet 4.5 via Converse API.
 *
 * Behaviour:
 *  - "Active AI" by default. If env vars are missing or the model is
 *    inaccessible, the client throws — UI surfaces a real error.
 *  - Mock mode is only enabled when USE_MOCK_AI=true. It's a developer
 *    explicit choice, never a silent fallback.
 *  - Vision (image input) is supported.
 */
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

const PRIMARY_MODEL =
  process.env.BEDROCK_MODEL_ID ?? 'us.anthropic.claude-sonnet-4-5-20250929-v1:0';
const FALLBACK_MODEL =
  process.env.BEDROCK_FALLBACK_MODEL_ID ?? 'amazon.nova-lite-v1:0';
const REGION = process.env.AWS_REGION ?? 'us-east-1';

export const ALLOW_MOCK = String(process.env.USE_MOCK_AI ?? 'false').toLowerCase() === 'true';

let client: BedrockRuntimeClient | null = null;
let activeModel = PRIMARY_MODEL;
let lastError: string | null = null;

/** Inspect environment + return any developer-facing config errors. */
export function aiConfigError(): string | null {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return 'AWS credentials missing. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env.local.';
  }
  if (!process.env.AWS_REGION) {
    return 'AWS_REGION missing. Set it to the region with Bedrock model access (e.g. us-east-1).';
  }
  if (!process.env.BEDROCK_MODEL_ID) {
    return 'BEDROCK_MODEL_ID missing. Set it to a model id you have access to.';
  }
  return null;
}

function getClient(): BedrockRuntimeClient | null {
  if (aiConfigError()) return null;
  if (client) return client;
  try {
    const sessionToken = process.env.AWS_SESSION_TOKEN;
    client = new BedrockRuntimeClient({
      region: REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        ...(sessionToken ? { sessionToken } : {})
      }
    });
    return client;
  } catch (e: any) {
    lastError = e?.message || String(e);
    return null;
  }
}

export function isBedrockEnabled(): boolean {
  return getClient() !== null;
}

export function getModelId(): string {
  return activeModel;
}

export function getLastBedrockError(): string | null {
  return lastError;
}

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

type ConverseContent =
  | { text: string }
  | { image: { format: 'jpeg' | 'png' | 'gif' | 'webp'; source: { bytes: Uint8Array } } };

async function callConverse(
  modelId: string,
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: ConverseContent[] }[],
  opts?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const c = getClient();
  if (!c) throw new Error('AI not configured: ' + (aiConfigError() ?? 'unknown'));

  const cmd = new ConverseCommand({
    modelId,
    system: systemPrompt ? [{ text: systemPrompt }] : undefined,
    messages: messages as any,
    inferenceConfig: {
      maxTokens: opts?.maxTokens ?? 800,
      temperature: opts?.temperature ?? 0.3
    }
  });

  const res = await c.send(cmd);
  return res.output?.message?.content?.[0]?.text ?? '';
}

/**
 * Adds a fallback ONLY when:
 *  - the primary returned an explicit access / validation / not-found error
 *  - AND USE_MOCK_AI=true (i.e. we are explicitly in mock-tolerant mode)
 *
 * Otherwise the original error bubbles up so the UI can show it.
 */
async function withMaybeFallback(
  systemPrompt: string,
  msgs: { role: 'user' | 'assistant'; content: ConverseContent[] }[],
  opts?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  try {
    const out = await callConverse(activeModel, systemPrompt, msgs, opts);
    lastError = null;
    return out;
  } catch (e: any) {
    const msg = e?.message || String(e);
    const code = e?.name || '';
    lastError = msg;
    const isAccessIssue =
      /AccessDenied|ValidationException|ResourceNotFound|not authorized|model identifier/i.test(msg) ||
      /AccessDenied|Validation/.test(code);

    if (isAccessIssue && ALLOW_MOCK && activeModel !== FALLBACK_MODEL) {
      try {
        const out = await callConverse(FALLBACK_MODEL, systemPrompt, msgs, opts);
        activeModel = FALLBACK_MODEL;
        lastError = `Primary model unavailable, fell back to ${FALLBACK_MODEL}`;
        return out;
      } catch (e2: any) {
        lastError = e2?.message || String(e2);
        throw e2;
      }
    }
    throw e;
  }
}

export async function bedrockChat(
  systemPrompt: string,
  messages: ChatMessage[],
  opts?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  return withMaybeFallback(
    systemPrompt,
    messages.map((m) => ({ role: m.role, content: [{ text: m.content }] })),
    opts
  );
}

export async function bedrockJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  opts?: { maxTokens?: number; temperature?: number }
): Promise<T> {
  const wrapped =
    systemPrompt +
    '\n\nIMPORTANT: Respond with ONLY a JSON object. No prose. No markdown fences. Output must be valid, parseable JSON.';
  const text = await bedrockChat(wrapped, [{ role: 'user', content: userPrompt }], opts);
  return parseJSON<T>(text);
}

export async function bedrockVisionJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  dataUrl: string,
  opts?: { maxTokens?: number; temperature?: number }
): Promise<T> {
  const wrapped =
    systemPrompt +
    '\n\nIMPORTANT: Respond with ONLY a JSON object. No prose. No markdown fences. Output must be valid, parseable JSON.';

  const { format, bytes } = parseDataUrl(dataUrl);
  const text = await withMaybeFallback(
    wrapped,
    [
      {
        role: 'user',
        content: [{ text: userPrompt }, { image: { format, source: { bytes } } }]
      }
    ],
    opts
  );
  return parseJSON<T>(text);
}

function parseDataUrl(dataUrl: string): { format: 'jpeg' | 'png' | 'gif' | 'webp'; bytes: Uint8Array } {
  const m = /^data:image\/(jpeg|jpg|png|gif|webp|heic|heif);base64,(.+)$/i.exec(dataUrl);
  if (!m) throw new Error('Invalid image data URL. Expected base64-encoded JPEG/PNG/WEBP.');
  let format = m[1].toLowerCase();
  if (format === 'jpg') format = 'jpeg';
  if (format === 'heic' || format === 'heif') {
    throw new Error('HEIC images are not supported by the AI vision API. Please convert to JPEG/PNG and retry.');
  }
  const buffer = Buffer.from(m[2], 'base64');
  if (buffer.byteLength === 0) throw new Error('Image is empty.');
  if (buffer.byteLength > 4_500_000) {
    // Bedrock vision per-image hard limit ~5MB; keep margin.
    throw new Error('Image is larger than 4.5 MB after encoding. Please use a smaller image.');
  }
  return { format: format as any, bytes: new Uint8Array(buffer) };
}

function parseJSON<T>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?\s*/gim, '')
    .replace(/\s*```\s*$/gim, '')
    .trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  const slice = first >= 0 && last > first ? cleaned.slice(first, last + 1) : cleaned;
  try {
    return JSON.parse(slice) as T;
  } catch (e: any) {
    throw new Error('AI returned non-JSON response. Raw: ' + slice.slice(0, 200));
  }
}
