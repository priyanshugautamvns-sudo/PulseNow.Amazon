'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Cpu } from 'lucide-react';

type Status = { bedrock_enabled: boolean; model: string; mock_allowed?: boolean; config_error?: string | null };

let cache: Status | null = null;

export function useAIStatus() {
  const [status, setStatus] = useState<Status | null>(cache);
  useEffect(() => {
    if (cache) return;
    fetch('/api/chat')
      .then((r) => r.json())
      .then((j) => {
        cache = j;
        setStatus(j);
      })
      .catch(() => {});
  }, []);
  return status;
}

export function AIStatusPill({ inline }: { inline?: boolean }) {
  const status = useAIStatus();
  if (!status) {
    return (
      <span className="pill-soft inline-flex">
        <Cpu className="w-3 h-3" /> AI…
      </span>
    );
  }
  if (status.bedrock_enabled) {
    return (
      <span className={`${inline ? 'pill-good inline-flex' : 'pill-good'}`}>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-good opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-good" />
        </span>
        <Sparkles className="w-3 h-3" /> Bedrock live · {humanModel(status.model)}
      </span>
    );
  }
  return (
    <span className="pill-soft inline-flex">
      <Cpu className="w-3 h-3" /> Mock mode
    </span>
  );
}

function humanModel(m: string) {
  if (m.includes('nova-micro')) return 'Nova Micro';
  if (m.includes('nova-lite')) return 'Nova Lite';
  if (m.includes('nova-pro')) return 'Nova Pro';
  if (m.includes('claude-3-haiku')) return 'Claude 3 Haiku';
  if (m.includes('claude-3-5-haiku')) return 'Claude 3.5 Haiku';
  if (m.includes('claude-3-5-sonnet')) return 'Claude 3.5 Sonnet';
  return m;
}
