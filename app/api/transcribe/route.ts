import { NextResponse } from 'next/server';
import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
  type TranscriptResultStream
} from '@aws-sdk/client-transcribe-streaming';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/transcribe
 *
 * Body (JSON):
 *   {
 *     "pcm_base64": "<base64-encoded 16kHz mono 16-bit PCM>",
 *     "language": "en-IN" | "hi-IN" | "auto"   // optional
 *   }
 *
 * The browser is responsible for decoding the user's MP3/M4A/WebM/OGG
 * upload to PCM 16kHz mono 16-bit using Web Audio. That keeps this
 * server route dependency-free (no ffmpeg) while still using a real
 * AWS Transcribe call.
 */
export async function POST(req: Request) {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return NextResponse.json({ error: 'AWS credentials missing on server.' }, { status: 500 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const b64 = (body?.pcm_base64 ?? '').toString();
  if (!b64) return NextResponse.json({ error: 'pcm_base64 is required' }, { status: 400 });

  let pcm: Buffer;
  try {
    pcm = Buffer.from(b64, 'base64');
  } catch {
    return NextResponse.json({ error: 'pcm_base64 is not valid base64' }, { status: 400 });
  }

  if (pcm.length < 3200) {
    return NextResponse.json({ error: 'audio too short (min ~100 ms)' }, { status: 400 });
  }
  if (pcm.length > 30 * 16000 * 2 * 4) {
    // safety cap: ~4 minutes at 16 kHz mono 16-bit
    return NextResponse.json({ error: 'audio too long' }, { status: 413 });
  }

  const language = (body?.language ?? 'en-IN').toString();

  const client = new TranscribeStreamingClient({
    region: process.env.AWS_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN } : {})
    }
  });

  // Yield chunks at roughly 100 ms intervals (AWS recommends 50-200 ms).
  // Each chunk = 100 ms × 16,000 samples/s × 2 bytes = 3200 bytes.
  const CHUNK = 3200;
  async function* audioStream() {
    for (let i = 0; i < pcm.length; i += CHUNK) {
      yield { AudioEvent: { AudioChunk: pcm.subarray(i, Math.min(i + CHUNK, pcm.length)) } };
      // Tiny pause so the service treats this as streaming rather than dumped buffer.
      await new Promise((r) => setTimeout(r, 10));
    }
  }

  const command = new StartStreamTranscriptionCommand({
    LanguageCode: language as any,
    MediaSampleRateHertz: 16000,
    MediaEncoding: 'pcm',
    AudioStream: audioStream() as any
  });

  try {
    const response = await client.send(command);
    let transcript = '';
    if (response.TranscriptResultStream) {
      for await (const event of response.TranscriptResultStream as AsyncIterable<TranscriptResultStream>) {
        const e: any = event;
        const results = e?.TranscriptEvent?.Transcript?.Results ?? [];
        for (const r of results) {
          if (r.IsPartial === false) {
            const alt = r.Alternatives?.[0]?.Transcript ?? '';
            if (alt) transcript += (transcript ? ' ' : '') + alt;
          }
        }
      }
    }

    return NextResponse.json({
      transcript: transcript.trim(),
      language,
      source: 'amazon-transcribe'
    });
  } catch (e: any) {
    console.error('[transcribe]', e?.name, e?.message);
    return NextResponse.json(
      { error: humaniseTranscribeError(e), code: e?.name },
      { status: 500 }
    );
  }
}

function humaniseTranscribeError(e: any): string {
  const msg = String(e?.message ?? e);
  if (/AccessDenied|UnrecognizedClient/i.test(msg))
    return 'AWS account does not have access to Amazon Transcribe Streaming. Add transcribe:StartStreamTranscription to the IAM user.';
  if (/BadRequest|invalid sample rate/i.test(msg))
    return 'Audio format invalid. Make sure it is 16 kHz mono 16-bit PCM.';
  if (/TooLong|TimeoutException/i.test(msg))
    return 'Audio is too long for a single streaming session. Use a shorter clip.';
  if (/Throttling/i.test(msg))
    return 'Transcribe is rate-limiting requests. Try again in a moment.';
  return 'Transcription failed: ' + msg;
}
