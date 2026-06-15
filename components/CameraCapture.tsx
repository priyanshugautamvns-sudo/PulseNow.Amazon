'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, X, Upload, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserPreferences } from '@/lib/userPreferences';

/**
 * CameraCapture — getUserMedia with file-upload fallback.
 * Props:
 *   - onCapture(dataUrl): called when user snaps or uploads
 *   - label: button label
 */
type Props = {
  onCapture: (dataUrl: string) => void;
  label?: string;
  buttonClassName?: string;
};

export function CameraCapture({ onCapture, label = 'Open camera', buttonClassName }: Props) {
  const { prefs } = useUserPreferences();
  const [open, setOpen] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
  };

  const close = () => {
    stop();
    setOpen(false);
    setError(null);
  };

  const start = async () => {
    if (!prefs.cameraEnabled) {
      setError('Camera is turned off in Settings. You can upload an image instead.');
      return;
    }
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Camera is not supported in this browser. Upload an image instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);
      setError(null);
    } catch (e: any) {
      const code = e?.name || '';
      if (/NotAllowed|Permission/.test(code)) {
        setError('Camera permission was blocked. Upload an image instead.');
      } else {
        setError('Could not start the camera. Upload an image instead.');
      }
    }
  };

  useEffect(() => {
    if (open) start();
    return () => stop();
    // eslint-disable-next-line
  }, [open]);

  const snap = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    const dataUrl = c.toDataURL('image/jpeg', 0.85);
    try { (navigator as any).vibrate?.(15); } catch {}
    onCapture(dataUrl);
    close();
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      onCapture(reader.result as string);
      close();
    };
    reader.readAsDataURL(f);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={buttonClassName ?? 'btn-dark'}
        aria-label={label}
      >
        <Camera className="w-4 h-4" /> {label}
      </button>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26 }}
              className="fixed bottom-0 inset-x-0 z-50 max-w-md mx-auto"
            >
              <div className="bg-surface border-t border-x border-line rounded-t-3xl p-4 shadow-e3">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-brand-amber font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Pulse Vision
                    </div>
                    <div className="font-semibold mt-0.5">Camera capture</div>
                    <div className="text-[11px] text-ink-300 mt-0.5">
                      Used only to identify products or shopping lists. You stay in control.
                    </div>
                  </div>
                  <button onClick={close} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center" aria-label="Close">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {!error && (
                  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-line bg-black">
                    <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                    {streaming && <div className="absolute inset-x-0 h-px bg-brand-amber scan-line" />}
                  </div>
                )}

                {error && (
                  <div className="surface-soft p-4 text-[13px] text-warn">{error}</div>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="btn-dark"
                  >
                    <Upload className="w-4 h-4" /> Upload image
                  </button>
                  <button
                    onClick={snap}
                    disabled={!streaming}
                    className="btn-primary disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" /> Snap
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
