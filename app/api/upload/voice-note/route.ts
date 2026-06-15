import { NextResponse } from 'next/server';
import { processVoiceNote } from '@/lib/agents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/upload/voice-note
 *
 * Body:
 *   { transcript?: string, audio_data_url?: string, preferences?: object }
 *
 * Production: receives audio_data_url, calls Amazon Transcribe (websocket),
 * passes transcript to Claude Sonnet for cart extraction.
 *
 * Prototype: requires `transcript` from the client. The client uses a
 * sample voice-note transcript or asks the user to confirm what they said.
 * This is the honest, demo-ready path without a Transcribe subscription.
 */
export async function POST(req: Request) {
  const body = await req.json();
  const transcript = (body?.transcript ?? '').toString();
  const preferences = body?.preferences && typeof body.preferences === 'object' ? body.preferences : undefined;

  if (!transcript) {
    return NextResponse.json(
      {
        error:
          'Audio transcription requires Amazon Transcribe in production. For this prototype, send a transcript field with the spoken content.',
        productionPath: 'audio_data_url -> Amazon Transcribe -> transcript -> Claude Sonnet'
      },
      { status: 400 }
    );
  }

  const result = await processVoiceNote(transcript, preferences);
  return NextResponse.json(result);
}
