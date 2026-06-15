'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Camera, FileText, Sparkles, CheckCircle2, X, Upload, AlertTriangle,
  Image as ImageIcon, AudioLines, Headphones, ScanLine
} from 'lucide-react';
import { inr } from '@/lib/format';
import type { Product } from '@/lib/types';
import { useCart } from '@/lib/cart';
import { useUserPreferences } from '@/lib/userPreferences';
import { UnavailableSection } from '@/components/UnavailableSection';
import voiceNoteSamples from '@/data/voiceNoteSamples.json';

type Mode = 'product' | 'list' | 'voice';
type Source = 'idle' | 'camera' | 'upload';

type ListResult = {
  raw_lines: string[];
  matches: { line: string; product: Product; confidence: number }[];
  notInCatalog: { line: string; reason?: string }[];
  source: 'bedrock' | 'mock';
  error?: string;
};

type ProductResult = {
  detected: string;
  product: Product | null;
  confidence: number;
  note: string;
  notInCatalog?: { name: string; reason?: string };
  source: 'bedrock' | 'mock';
  error?: string;
};

type VoiceResult = {
  transcript: string;
  language: 'english' | 'hindi' | 'hinglish';
  picks: { product: Product; qty: number; note?: string }[];
  notInCatalog: { name: string; reason?: string }[];
  outOfStock: { product: Product; substitute?: Product | null }[];
  message: string;
  source: 'bedrock' | 'mock';
  error?: string;
};

const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6 MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function UploadInner() {
  const router = useRouter();
  const params = useSearchParams();
  const cart = useCart();
  const { prefs, forAI } = useUserPreferences();

  const initial = (params.get('mode') as Mode) || 'product';
  const [mode, setMode] = useState<Mode>(['product', 'list', 'voice'].includes(initial) ? initial : 'product');

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="w-9 h-9 rounded-full bg-surface border border-line flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-brand-amber flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Pulse Upload
          </div>
          <h1 className="text-lg font-semibold leading-tight">Photo, list or voice — Pulse builds your cart</h1>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="card p-1.5 grid grid-cols-3 gap-1">
        <Tab id="product" active={mode === 'product'} onClick={() => setMode('product')} icon={<ImageIcon className="w-4 h-4" />} label="Product photo" />
        <Tab id="list" active={mode === 'list'} onClick={() => setMode('list')} icon={<FileText className="w-4 h-4" />} label="Handwritten list" />
        <Tab id="voice" active={mode === 'voice'} onClick={() => setMode('voice')} icon={<Headphones className="w-4 h-4" />} label="Voice note" />
      </div>

      {(mode === 'product' || mode === 'list') && (
        <ImageFlow
          mode={mode}
          cameraEnabled={prefs.cameraEnabled}
          onCart={(picks) => {
            cart.addMany(picks.map((p) => ({ product: p.product, qty: p.qty, note: p.note })), false);
            router.push(`/checkout?label=${encodeURIComponent(mode === 'list' ? 'Handwritten list' : 'Photo reorder')}`);
          }}
        />
      )}

      {mode === 'voice' && (
        <VoiceNoteFlow
          forAI={forAI}
          onCart={(picks) => {
            cart.addMany(picks.map((p) => ({ product: p.product, qty: p.qty, note: p.note })), false);
            router.push('/checkout?label=Voice+note');
          }}
        />
      )}
    </div>
  );
}

function Tab({ active, onClick, icon, label }: { id: string; active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`py-2 rounded-lg text-[13px] flex items-center justify-center gap-1.5 transition ${
        active ? 'bg-brand-navy text-white font-semibold' : 'text-ink-200 hover:bg-muted'
      }`}
    >
      {icon} {label}
    </button>
  );
}

/* ----------------- IMAGE FLOW (camera + upload) ----------------- */

function ImageFlow({
  mode,
  cameraEnabled,
  onCart
}: {
  mode: 'product' | 'list';
  cameraEnabled: boolean;
  onCart: (picks: { product: Product; qty: number; note?: string }[]) => void;
}) {
  const router = useRouter();
  const [source, setSource] = useState<Source>('idle');

  // Two SEPARATE inputs:
  //   gallery picker → no `capture` attribute (so phones do not force camera)
  //   camera fallback → uses `capture="environment"` for browsers without getUserMedia
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraFallbackRef = useRef<HTMLInputElement | null>(null);

  const [streaming, setStreaming] = useState(false);
  const [permError, setPermError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [previewMeta, setPreviewMeta] = useState<{ name: string; sizeKB: number; format: string } | null>(null);

  const [phase, setPhase] = useState<'idle' | 'reading' | 'matching'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [productResult, setProductResult] = useState<ProductResult | null>(null);
  const [listResult, setListResult] = useState<ListResult | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
  };

  const closeCamera = () => {
    stopStream();
    setSource('idle');
    setPermError(null);
  };

  const startCamera = async () => {
    if (!cameraEnabled) {
      setPermError('Camera is turned off in Settings. Use upload below.');
      return;
    }
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      // Fallback to file input with capture="environment".
      cameraFallbackRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);
      setPermError(null);
    } catch (e: any) {
      const code = e?.name || '';
      if (/NotAllowed|Permission/.test(code)) setPermError('Camera permission was blocked. Use upload below.');
      else setPermError('Could not start the camera. Use upload below.');
    }
  };

  useEffect(() => {
    if (source === 'camera') startCamera();
    return () => stopStream();
    // eslint-disable-next-line
  }, [source]);

  const onSnap = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    const dataUrl = c.toDataURL('image/jpeg', 0.85);
    closeCamera();
    setPreview(dataUrl);
    setPreviewMeta({ name: 'camera-capture.jpg', sizeKB: Math.round(dataUrl.length * 0.75 / 1024), format: 'image/jpeg' });
    runAnalysis(dataUrl);
  };

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError(`This file type (${file.type || 'unknown'}) isn't supported. Use JPG, PNG, or WebP.`);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(`Image is ${(file.size / 1024 / 1024).toFixed(1)} MB. Max allowed is ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`);
      return;
    }
    try {
      const dataUrl = await downscaleImage(file, 1600);
      setPreview(dataUrl);
      setPreviewMeta({ name: file.name, sizeKB: Math.round(file.size / 1024), format: file.type });
      setError(null);
      runAnalysis(dataUrl);
    } catch (e: any) {
      console.error('[upload] decode failed', e);
      setError('Could not read this image. Try another file.');
    }
  };

  const runAnalysis = async (dataUrl: string) => {
    setError(null);
    setProductResult(null);
    setListResult(null);
    setPhase('reading');
    try {
      const url = mode === 'list' ? '/api/vision/scan-list' : '/api/vision/scan-product';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl })
      });
      if (!res.ok) throw new Error(`Vision API returned ${res.status}`);
      setPhase('matching');
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else if (mode === 'list') {
        setListResult(data);
      } else {
        setProductResult(data);
      }
    } catch (e: any) {
      console.error('[upload] vision call failed', e);
      setError('Image could not be read. Try a clearer photo or upload another image.');
    } finally {
      setPhase('idle');
    }
  };

  const reset = () => {
    setPreview(null);
    setPreviewMeta(null);
    setError(null);
    setProductResult(null);
    setListResult(null);
  };

  return (
    <>
      {!preview && source === 'idle' && (
        <div className="card p-5 space-y-3">
          <div className="text-[13px] text-ink-300">
            {mode === 'list'
              ? 'Snap a handwritten or printed shopping list. Pulse Vision (Claude Sonnet) reads each line and matches your catalog.'
              : 'Snap an empty packet, label, or product. Pulse Vision identifies it and matches your catalog.'}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setSource('camera')} className="btn-primary">
              <Camera className="w-4 h-4" /> Camera Scan
            </button>
            <button onClick={() => galleryInputRef.current?.click()} className="btn-dark">
              <Upload className="w-4 h-4" /> Upload from Device
            </button>
          </div>

          {/* Gallery picker — NO capture attribute, so mobile shows the gallery, not the camera. */}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          {/* Camera-only fallback for browsers without getUserMedia. */}
          <input
            ref={cameraFallbackRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />

          <p className="text-[11px] text-ink-400">
            Camera: opens device camera (permission required).<br />
            Upload from Device: opens your gallery / file picker.<br />
            Image is sent to AWS Bedrock (Claude Sonnet) for one-shot analysis. Nothing is stored.
          </p>
        </div>
      )}

      {/* Live camera */}
      {source === 'camera' && (
        <div className="card p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[12px] text-ink-200 font-semibold">Camera</div>
            <button onClick={closeCamera} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
          </div>
          {permError ? (
            <div className="surface-soft p-4 text-[13px] text-warn flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {permError}
            </div>
          ) : (
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-line bg-black">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              {streaming && <div className="absolute inset-x-0 h-px bg-brand-amber scan-line" />}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => galleryInputRef.current?.click()} className="btn-dark">
              <Upload className="w-4 h-4" /> Upload instead
            </button>
            <button onClick={onSnap} disabled={!streaming} className="btn-primary disabled:opacity-50">
              <Camera className="w-4 h-4" /> Snap
            </button>
          </div>
          <input ref={galleryInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
        </div>
      )}

      {/* Preview + analysis */}
      {preview && (
        <div className="space-y-3">
          <div className="card p-3 flex items-start gap-3">
            <img src={preview} alt="capture" className="w-24 h-24 rounded-xl object-cover border border-line" />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-brand-amber font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {phase === 'reading' && 'Reading image…'}
                {phase === 'matching' && 'Matching with catalog…'}
                {phase === 'idle' && 'Captured'}
              </div>
              {previewMeta && (
                <div className="text-[11px] text-ink-300 mt-1">
                  {previewMeta.name} · {previewMeta.sizeKB}KB · {previewMeta.format}
                </div>
              )}
              {phase !== 'idle' && (
                <div className="mt-2 flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-amber animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-amber animate-bounce [animation-delay:120ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-amber animate-bounce [animation-delay:240ms]" />
                </div>
              )}
              <button onClick={reset} className="text-[12px] text-bad mt-2">Retake / replace</button>
            </div>
          </div>

          {error && (
            <div className="surface-soft p-3 text-[13px] text-warn flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {mode === 'product' && productResult && <ProductResultView result={productResult} onAdd={(p) => onCart([{ product: p, qty: 1 }])} />}
          {mode === 'list' && listResult && <ListResultView result={listResult} onAdd={(picks) => onCart(picks)} />}
        </div>
      )}
    </>
  );
}

function ProductResultView({ result, onAdd }: { result: ProductResult; onAdd: (p: Product) => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <div className="card p-4">
        <div className="text-[11px] uppercase tracking-wider text-good font-semibold flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Detected: {result.detected || '—'}
        </div>
        {result.product ? (
          <div className="surface-soft p-3 mt-3 flex items-center gap-3">
            <div className="text-3xl">{result.product.image}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold leading-tight truncate">{result.product.name}</div>
              <div className="text-[11px] text-ink-300">{inr(result.product.price)} · {result.product.delivery_eta_minutes} min</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[10px] text-ink-300">Confidence</div>
              <div className="font-semibold text-brand-amber">{Math.round(result.confidence * 100)}%</div>
            </div>
          </div>
        ) : (
          <div className="surface-soft p-3 mt-3">
            <div className="text-[13px] font-semibold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-warn" /> Not in catalog</div>
            <div className="text-[12px] text-ink-300 mt-1">
              Pulse Vision identified this item but it isn't sold via Pulse Now today.
            </div>
            {result.notInCatalog && (
              <div className="text-[11px] text-ink-400 mt-2">
                Item: <span className="text-ink-200 font-medium">{result.notInCatalog.name}</span>
                {result.notInCatalog.reason ? ` — ${result.notInCatalog.reason}` : ''}
              </div>
            )}
          </div>
        )}
        <div className="mt-2 text-[11px] text-ink-400 italic">
          {result.note} · via {result.source === 'bedrock' ? 'Claude Sonnet' : 'mock'}
        </div>
      </div>
      {result.product && (
        <button onClick={() => onAdd(result.product!)} className="btn-primary w-full">Add to cart</button>
      )}
    </motion.div>
  );
}

function ListResultView({ result, onAdd }: { result: ListResult; onAdd: (picks: { product: Product; qty: number }[]) => void }) {
  const total = result.matches.reduce((s, m) => s + m.product.price, 0);
  const eta = result.matches.length ? Math.max(...result.matches.map((m) => m.product.delivery_eta_minutes)) : 0;
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <div className="card p-4">
        <div className="text-[11px] uppercase tracking-wider text-good font-semibold flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> {result.matches.length} item{result.matches.length === 1 ? '' : 's'} matched
        </div>
        <div className="mt-2 space-y-2">
          {result.matches.map((m) => (
            <div key={m.product.id + m.line} className="surface-soft p-2.5 flex items-center gap-3">
              <div className="text-2xl">{m.product.image}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-ink-300 italic font-mono">"{m.line}"</div>
                <div className="text-[13px] font-medium truncate">{m.product.name}</div>
                <div className="text-[10px] text-ink-300">{inr(m.product.price)} · {m.product.delivery_eta_minutes}m</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-ink-300">Conf.</div>
                <div className="font-semibold text-brand-amber text-[13px]">{Math.round(m.confidence * 100)}%</div>
              </div>
            </div>
          ))}
        </div>

        {result.notInCatalog.length > 0 && (
          <div className="mt-3">
            <UnavailableSection
              notInCatalog={result.notInCatalog.map((n) => ({ name: n.line, reason: n.reason }))}
              compact
            />
          </div>
        )}

        {result.matches.length > 0 && (
          <div className="mt-3 flex items-center justify-between text-sm border-t border-line pt-3">
            <span className="text-ink-300">ETA {eta} min</span>
            <span className="font-bold">{inr(total)}</span>
          </div>
        )}
        <div className="text-[11px] text-ink-400 mt-2">via {result.source === 'bedrock' ? 'Claude Sonnet vision' : 'mock'}</div>
      </div>
      {result.matches.length > 0 && (
        <button onClick={() => onAdd(result.matches.map((m) => ({ product: m.product, qty: 1 })))} className="btn-primary w-full">
          Add {result.matches.length} item{result.matches.length === 1 ? '' : 's'} to cart
        </button>
      )}
    </motion.div>
  );
}

/* ----------------- VOICE NOTE FLOW ----------------- */

function VoiceNoteFlow({ forAI, onCart }: { forAI: () => any; onCart: (picks: { product: Product; qty: number; note?: string }[]) => void }) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [audioFile, setAudioFile] = useState<{ file?: File; sampleId?: string; name: string; sizeKB: number; format: string } | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcriptDraft, setTranscriptDraft] = useState('');
  const [phase, setPhase] = useState<'idle' | 'transcribing' | 'understanding' | 'matching' | 'checking' | 'ready'>('idle');
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAudio = (file: File | null | undefined) => {
    if (!file) return;
    const accepted = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/m4a', 'audio/x-m4a'];
    if (!accepted.includes(file.type) && !/\.(mp3|wav|m4a|webm|ogg|aac)$/i.test(file.name)) {
      setError('Unsupported audio format. Use MP3, WAV, M4A, WebM, OGG, AAC.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError(`Audio is ${(file.size / 1024 / 1024).toFixed(1)} MB. Max 12 MB.`);
      return;
    }
    setError(null);
    setAudioFile({ file, name: file.name, sizeKB: Math.round(file.size / 1024), format: file.type || 'audio/*' });
    setAudioUrl(URL.createObjectURL(file));
    setResult(null);
  };

  const useSample = (sample: any) => {
    setAudioFile({ sampleId: sample.id, name: `${sample.label} (sample voice note)`, sizeKB: 0, format: 'sample' });
    setAudioUrl(null);
    setTranscriptDraft(sample.transcript);
    setResult(null);
  };

  const submit = async () => {
    setError(null);
    setResult(null);

    let transcript = (transcriptDraft || '').trim();

    // If the user uploaded a real audio file (not a sample) and there
    // is no manual transcript yet, run AWS Transcribe on it.
    if (audioFile?.file && !transcript) {
      setPhase('transcribing');
      try {
        const pcm = await decodeAudioToPcm16kMono(audioFile.file);
        if (pcm.byteLength < 3200) {
          throw new Error('Audio is too short to transcribe.');
        }
        const b64 = uint8ToBase64(pcm);
        const tRes = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pcm_base64: b64, language: 'en-IN' })
        });
        const tData = await tRes.json();
        if (!tRes.ok) throw new Error(tData?.error || `Transcribe failed (${tRes.status})`);
        transcript = (tData.transcript ?? '').trim();
        if (!transcript) throw new Error('No speech detected in the audio file.');
        // Surface the transcript so the user can review it.
        setTranscriptDraft(transcript);
      } catch (e: any) {
        console.error('[upload.voice.transcribe]', e);
        setError(e?.message ?? 'Could not transcribe the audio.');
        setPhase('idle');
        return;
      }
    }

    if (!transcript) {
      setPhase('idle');
      setError('No transcript yet. Upload a voice note or pick a sample.');
      return;
    }

    setPhase('understanding');
    try {
      const res = await fetch('/api/upload/voice-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, preferences: forAI() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `API ${res.status}`);
      setPhase('matching');
      setResult(data);
      setPhase('ready');
    } catch (e: any) {
      console.error('[upload.voice]', e);
      setError(e?.message ?? 'Voice note could not be processed.');
      setPhase('idle');
    }
  };

  const total = result?.picks.reduce((s, p) => s + p.product.price * p.qty, 0) ?? 0;

  return (
    <div className="space-y-3">
      <div className="card p-4 space-y-3">
        <div className="text-[13px] text-ink-300">
          Drop a WhatsApp voice note here. Pulse transcribes it, extracts the order, matches your catalog, and shows what's in stock.
        </div>
        <button onClick={() => fileRef.current?.click()} className="btn-primary w-full">
          <AudioLines className="w-4 h-4" /> Upload voice note from device
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/mpeg,audio/mp3,audio/wav,audio/webm,audio/ogg,audio/mp4,audio/aac,audio/m4a,audio/x-m4a,.mp3,.wav,.m4a,.ogg,.aac,.webm"
          hidden
          onChange={(e) => handleAudio(e.target.files?.[0] ?? null)}
        />
        <p className="text-[11px] text-ink-400">
          Want to record live instead? Use <Link href="/voice-order" className="text-brand-amber hover:underline">Voice order</Link> on the home page.
          Audio is decoded in your browser to 16 kHz PCM and streamed to <span className="text-ink-200">Amazon Transcribe</span>, then to Pulse AI.
        </p>

        <div>
          <div className="text-[11px] uppercase tracking-wider text-ink-300 font-semibold mb-1.5">Or pick a sample</div>
          <div className="grid grid-cols-2 gap-2">
            {(voiceNoteSamples as any[]).map((s) => (
              <button
                key={s.id}
                onClick={() => useSample(s)}
                className="text-left p-3 rounded-xl border border-line bg-surface hover:border-brand-orange/40 text-[12px]"
              >
                <div className="flex items-center gap-2 text-brand-amber"><Headphones className="w-3.5 h-3.5" /> {s.label}</div>
                <div className="text-ink-300 mt-1 truncate">{s.transcript}</div>
                <div className="text-[10px] text-ink-400 mt-1">{s.duration_sec}s · {s.language}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {audioFile && (
        <div className="card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[12px] font-semibold flex items-center gap-1.5"><AudioLines className="w-4 h-4 text-brand-amber" /> {audioFile.name}</div>
            <button onClick={() => { setAudioFile(null); setAudioUrl(null); setTranscriptDraft(''); setResult(null); }} className="text-[12px] text-bad">Remove</button>
          </div>
          {audioUrl && <audio src={audioUrl} controls className="w-full" />}
          <div className="text-[11px] uppercase tracking-wider text-ink-300 font-semibold mt-2">Transcript (edit or confirm)</div>
          <textarea
            value={transcriptDraft}
            onChange={(e) => setTranscriptDraft(e.target.value)}
            rows={3}
            className="w-full bg-canvas border border-line rounded-xl px-3 py-2 text-[13px] outline-none focus:border-brand-orange/40"
            placeholder="Paste or edit the transcript of the voice note…"
          />
          <button onClick={submit} disabled={phase !== 'idle' && phase !== 'ready'} className="btn-primary w-full mt-1">
            <Sparkles className="w-4 h-4" /> Extract order from voice note
          </button>
          {phase !== 'idle' && phase !== 'ready' && (
            <div className="text-[12px] text-brand-amber flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-amber animate-pulse" />
              {phase === 'transcribing' && 'Transcribing audio…'}
              {phase === 'understanding' && 'Understanding order…'}
              {phase === 'matching' && 'Matching products…'}
              {phase === 'checking' && 'Checking stock…'}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="surface-soft p-3 text-[13px] text-warn flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="card p-4">
            <div className="text-[11px] uppercase tracking-wider text-good font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Voice note understood · {result.language}
            </div>
            <div className="text-[14px] mt-1">{result.message}</div>
            <div className="mt-2 surface-soft p-2.5 text-[12px] text-ink-200 italic">"{result.transcript}"</div>
          </div>

          {result.picks.length > 0 && (
            <div className="card p-4 space-y-2">
              {result.picks.map((p) => (
                <div key={p.product.id} className="surface-soft p-2.5 flex items-center gap-3">
                  <div className="text-2xl">{p.product.image}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate">{p.product.name}</div>
                    <div className="text-[10px] text-ink-300">{p.product.brand}{p.note ? ` · ${p.note}` : ''} · {p.product.delivery_eta_minutes}m</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-ink-300">qty {p.qty}</div>
                    <div className="text-[13px] font-semibold">{inr(p.product.price * p.qty)}</div>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-line flex items-center justify-between text-sm">
                <span className="text-ink-300">Total</span>
                <span className="font-bold">{inr(total)}</span>
              </div>
            </div>
          )}

          {(result.outOfStock?.length || result.notInCatalog?.length) ? (
            <UnavailableSection outOfStock={result.outOfStock as any} notInCatalog={result.notInCatalog} />
          ) : null}

          {result.picks.length > 0 && (
            <button onClick={() => onCart(result.picks.map((p) => ({ product: p.product, qty: p.qty, note: p.note })))} className="btn-primary w-full">
              Add {result.picks.length} item{result.picks.length === 1 ? '' : 's'} to cart
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}

/* ----------------- helpers ----------------- */

/**
 * Downscale & re-encode the image client-side so the request payload
 * stays well under the Bedrock per-image limit and we never hit the
 * "image too large" path on slow networks.
 */
async function downscaleImage(file: File, maxEdge: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('canvas unavailable'));
        ctx.drawImage(img, 0, 0, w, h);
        // Re-encode to JPEG at 0.85 quality — most consistent with Bedrock vision.
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('image decode failed'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('file read failed'));
    reader.readAsDataURL(file);
  });
}

/**
 * Decode an arbitrary audio file (mp3 / m4a / webm / ogg / wav) to
 * 16 kHz mono 16-bit PCM bytes using Web Audio. AWS Transcribe expects
 * exactly this format. Caller posts the bytes (base64) to /api/transcribe.
 */
async function decodeAudioToPcm16kMono(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();

  // Decode the file to whatever its native sample rate / channels are.
  const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) throw new Error('AudioContext not supported in this browser.');
  const tmp = new Ctx();
  const decoded: AudioBuffer = await new Promise((resolve, reject) => {
    // Older Safari/iOS still use the callback signature.
    tmp.decodeAudioData(arrayBuffer.slice(0), resolve, reject);
  });
  try { tmp.close(); } catch {}

  // Resample + downmix using an OfflineAudioContext at 16 kHz mono.
  const targetRate = 16000;
  const lengthAtTargetRate = Math.ceil((decoded.duration || decoded.length / decoded.sampleRate) * targetRate);
  if (lengthAtTargetRate <= 0) throw new Error('Decoded audio is empty.');
  const Off: any = (window as any).OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  const offline = new Off(1, lengthAtTargetRate, targetRate);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start(0);
  const rendered: AudioBuffer = await offline.startRendering();

  const float = rendered.getChannelData(0);
  const int16 = new Int16Array(float.length);
  for (let i = 0; i < float.length; i++) {
    const s = Math.max(-1, Math.min(1, float[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return new Uint8Array(int16.buffer);
}

function uint8ToBase64(u8: Uint8Array): string {
  // Build the string in chunks to avoid "Maximum call stack size exceeded"
  // when the audio is several seconds long.
  let result = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < u8.length; i += CHUNK) {
    result += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + CHUNK)));
  }
  return btoa(result);
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="pt-10 text-ink-300">Loading…</div>}>
      <UploadInner />
    </Suspense>
  );
}
