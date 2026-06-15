'use client';

import { useEffect, useState } from 'react';
import { Activity, Server, Brain, BarChart3, Sparkles, Cpu, Network, Database, Cloud, Zap, ShieldCheck } from 'lucide-react';
import demoScenariosRaw from '@/data/demoScenarios.json';
import type { IntentResult, SmartCard } from '@/lib/types';
import { RankingBreakdownPanel } from '@/components/RankingBreakdown';
import { inr } from '@/lib/format';

const SCENARIOS = demoScenariosRaw as any[];

const METRICS = [
  { label: 'Decision time', before: '5 min', after: '7 sec', delta: '−96%' },
  { label: 'Taps per order', before: '8', after: '1 hold', delta: '−87%' },
  { label: 'Conversion uplift', before: '—', after: '+34%', delta: 'Δ' },
  { label: 'Avg order value', before: '₹245', after: '₹318', delta: '+30%' },
  { label: 'Repeat order rate', before: '38%', after: '61%', delta: '+23pp' },
  { label: 'Cart abandonment', before: '24%', after: '6%', delta: '−18pp' },
  { label: 'Stock-out recovery', before: '12%', after: '78%', delta: '+66pp' },
  { label: 'Est. revenue uplift', before: '—', after: '₹920 / cust / yr', delta: '↑' }
];

export default function DashboardPage() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const [intent, setIntent] = useState<IntentResult | null>(null);
  const [cards, setCards] = useState<SmartCard[]>([]);
  const [aiStatus, setAiStatus] = useState<{ bedrock_enabled: boolean; model: string } | null>(null);
  const scenario = SCENARIOS.find((s) => s.id === scenarioId);

  useEffect(() => {
    fetch('/api/chat')
      .then((r) => r.json())
      .then(setAiStatus);
  }, []);

  useEffect(() => {
    if (!scenario) return;
    fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: scenario.input })
    })
      .then((r) => r.json())
      .then((j) => {
        setIntent(j.intent);
        setCards(j.cards ?? []);
      });
  }, [scenarioId]);

  const top = cards[0];

  return (
    <div className="space-y-6 pt-4 pb-10">
      <header>
        <div className="text-[11px] uppercase tracking-wider text-brand-orange font-semibold flex items-center gap-1">
          <BarChart3 className="w-3 h-3" /> Architecture & business dashboard
        </div>
        <h1 className="text-[24px] md:text-[30px] font-semibold tracking-tight mt-1">Pulse Now control tower</h1>
        <p className="text-ink-500 text-[14px] mt-1 max-w-2xl">
          Every recommendation is transparent. Switch scenarios to see the agents and ranking math behind each decision.
        </p>
      </header>

      {/* AI status */}
      <div className="card p-3 flex items-center gap-2 text-[13px]">
        <Cpu className="w-4 h-4 text-brand-orange" />
        <span className="font-semibold">AI status</span>
        <span className={`pill ${aiStatus?.bedrock_enabled ? 'pill-good' : 'pill-soft'}`}>
          {aiStatus?.bedrock_enabled ? 'AWS Bedrock live' : 'Mock mode'}
        </span>
        <span className="text-ink-500">model: <code className="text-ink-700">{aiStatus?.model ?? '—'}</code></span>
      </div>

      {/* Business metrics */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {METRICS.map((m) => (
          <div key={m.label} className="card p-4">
            <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">{m.label}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-lg font-semibold">{m.after}</div>
              <div className="text-[11px] text-good font-semibold">{m.delta}</div>
            </div>
            <div className="text-[10px] text-ink-400 mt-0.5">was {m.before}</div>
          </div>
        ))}
      </section>

      {/* Scenario */}
      <section className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-brand-orange" />
          <div className="font-semibold">Demo scenario</div>
          <div className="ml-auto text-[12px] text-ink-500">Live agent trace</div>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => setScenarioId(s.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] ${
                s.id === scenarioId
                  ? 'bg-brand-navy text-white font-semibold'
                  : 'bg-surface text-ink-700 border border-line'
              }`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="surface-soft p-4">
            <div className="h-eyebrow flex items-center gap-1 mb-2">
              <Brain className="w-3.5 h-3.5 text-brand-orange" /> Intent agent output
            </div>
            {intent && (
              <div className="space-y-1.5 text-[13px]">
                <KV k="raw_input" v={intent.raw_input} />
                <KV k="intent_type" v={intent.intent_type} />
                <KV k="category" v={intent.category} />
                <KV k="goal" v={intent.goal} />
                <KV k="urgency_score" v={intent.urgency_score.toFixed(2)} />
                <KV k="cart_type" v={intent.cart_type} />
                <KV k="hinglish_response" v={intent.hinglish_response} />
              </div>
            )}
          </div>
          <div className="surface-soft p-4">
            <div className="h-eyebrow flex items-center gap-1 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-brand-orange" /> Top recommendation
            </div>
            {top && (
              <>
                <div className="font-semibold">{top.title}</div>
                <div className="text-[12px] text-ink-500">{top.subtitle}</div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-[12px]">
                  <KV k="ETA" v={`${top.eta_minutes} min`} />
                  <KV k="Price" v={inr(top.price_total)} />
                  <KV k="Score" v={`${Math.round(top.ranking.final_score * 100)}%`} />
                </div>
              </>
            )}
          </div>
        </div>

        {top && (
          <div className="mt-4">
            <RankingBreakdownPanel breakdown={top.ranking} />
          </div>
        )}

        {scenario && (
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="surface-soft p-3">
              <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Old journey</div>
              <div className="font-semibold text-bad">{scenario.before_minutes} min</div>
            </div>
            <div className="surface-soft p-3">
              <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">New journey</div>
              <div className="font-semibold text-good">{scenario.after_seconds} sec</div>
            </div>
            <div className="surface-soft p-3">
              <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Story</div>
              <div className="text-[11px] text-ink-700 leading-snug">{scenario.story}</div>
            </div>
          </div>
        )}
      </section>

      <ArchitectureDiagram />

      <section className="card p-4">
        <div className="h-eyebrow text-brand-orange flex items-center gap-1 mb-3">
          <Cpu className="w-3.5 h-3.5" /> AI agent registry
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {AGENTS.map((a) => (
            <div key={a.name} className="surface-soft p-3">
              <div className="text-[14px] font-semibold">{a.name}</div>
              <div className="text-[11px] text-ink-500 mt-0.5">{a.role}</div>
              <div className="mt-2 text-[10px] text-ink-400">Prod: {a.prod}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className="text-ink-500 font-mono w-32 shrink-0 truncate">{k}</span>
      <span className="font-medium truncate">{v}</span>
    </div>
  );
}

const AGENTS = [
  { name: 'Intent Understanding', role: 'NL → structured intent', prod: 'Amazon Bedrock (Claude 3 Haiku)' },
  { name: 'Conversational Chat', role: 'Free-form Q&A grounded in catalog', prod: 'Amazon Bedrock (Claude / Nova)' },
  { name: 'Need-to-Product', role: 'Goal → catalog SKUs', prod: 'OpenSearch + Titan embeddings' },
  { name: 'Preference', role: 'User memory & personalisation', prod: 'DynamoDB + SageMaker Personalize' },
  { name: 'Urgency', role: 'ETA + situation weight', prod: 'Lambda + dark-store API' },
  { name: 'Trust & Safety', role: 'Caution flags, substitutes', prod: 'Bedrock guardrails' },
  { name: 'Cart Builder', role: 'Compose 3-card output', prod: 'Lambda orchestrator' },
  { name: 'Explanation', role: 'Why this? pros/cons/usage', prod: 'Bedrock LLM' },
  { name: 'Prediction', role: 'Reorder cycle forecasting', prod: 'EventBridge + SageMaker forecast' },
  { name: 'Vision', role: 'Handwritten list + product photo', prod: 'Textract + Rekognition' }
];

function ArchitectureDiagram() {
  return (
    <section className="card p-4">
      <div className="h-eyebrow text-brand-orange flex items-center gap-1 mb-3">
        <Network className="w-3.5 h-3.5" /> Architecture
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        <Layer
          title="Ambient surfaces"
          icon={<Zap className="w-4 h-4" />}
          items={['App Pulse Bar', 'Home-screen widget', 'Lock-screen notif (Pinpoint)', 'Alexa skill', 'Voice + camera + handwritten list']}
        />
        <Layer
          title="AI agent layer"
          icon={<Brain className="w-4 h-4" />}
          items={['Bedrock for intent + chat + explanation', 'Titan embeddings for retrieval', 'SageMaker Personalize ranker', 'EventBridge for predictions', 'Textract + Rekognition for vision']}
        />
        <Layer
          title="Commerce backbone"
          icon={<Server className="w-4 h-4" />}
          items={['API Gateway + Lambda', 'OpenSearch product index', 'DynamoDB user memory', 'Dark-store inventory adapter', 'Amazon Pay UPI checkout']}
        />
        <Layer
          title="Data plane"
          icon={<Database className="w-4 h-4" />}
          items={['S3 list/photo uploads', 'Order history events', 'ElastiCache hot recos', 'Subscribe & Save state', 'Pharmacy / Fresh joins']}
        />
        <Layer
          title="Trust & safety"
          icon={<ShieldCheck className="w-4 h-4" />}
          items={['Wellness caution layer', 'User-controlled predictions', '5-second undo', 'Sensitive category extra confirm', 'Data minimisation']}
        />
        <Layer
          title="Operations"
          icon={<Cloud className="w-4 h-4" />}
          items={['CloudWatch + X-Ray', 'A/B in SageMaker', 'CDN-cached SmartCards', 'Multi-AZ failover', 'Scales to 50M+ households']}
        />
      </div>
    </section>
  );
}

function Layer({ title, icon, items }: { title: string; icon: React.ReactNode; items: string[] }) {
  return (
    <div className="surface-soft p-4">
      <div className="flex items-center gap-2 text-brand-orange mb-2">
        {icon}
        <div className="font-semibold text-[14px] text-ink-900">{title}</div>
      </div>
      <ul className="space-y-1 text-[12px] text-ink-700">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span className="text-brand-orange">•</span>
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
