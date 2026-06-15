# Amazon Pulse Now — v1.4
# Click to visit the site--https://pulsenowamazon.vercel.app/

> **From need to done — in seconds.** Amazon HackOn 6.0 prototype for *Amazon Now — Reimagining Urgent Shopping*.

Pulse Now is an India-first, AI-powered, ambient quick-commerce experience inside Amazon Now. Customers express a *need* — typed, spoken, snapped, scribbled, or sent as a WhatsApp voice note — and Pulse builds the cart. Every recommendation is **catalog-grounded** (no hallucinated SKUs, no out-of-stock surprises) and **personalised** by an onboarding profile saved on the device.

---

## What's new in v1.4

### Mobile upload bug — fixed
Two **separate** flows on `/upload`:
- **Camera Scan** — opens the device camera (`getUserMedia` with `facingMode: environment`), with a file-input fallback that still uses `capture="environment"` for browsers without a media stream API.
- **Upload from Device** — pure file picker. **No `capture` attribute**, so phones open the gallery, not the camera.

Each upload is validated (type + size + downscale to ≤1600px / JPEG quality 0.85) before it's sent to Bedrock so the "Vision failed" error path stops being silent.

### Voice-note upload (WhatsApp style)
New tab on `/upload` plus access from the floating Pulse AI assistant.
- Accept: `mp3, wav, webm, ogg, mp4, aac, m4a` — max 12 MB.
- Audio preview player with file name, size, format.
- Editable transcript (so the demo doesn't depend on a paid Transcribe subscription). For production, the audio is posted to Amazon Transcribe and the transcript is forwarded to Claude.
- Output: detected language, extracted items, matched catalog picks, **out-of-stock and not-in-catalog blocks**, and a single tap to send to checkout.

Sample voice notes in `data/voiceNoteSamples.json` (Hinglish, Hindi, English).

### AI is always active — no silent mock
- New env flag: `USE_MOCK_AI=false` (default).
- When false, AI failures show real, human-readable errors instead of a fake response.
- `aiAvailability()` exposes `bedrock_enabled`, model id, `mock_allowed`, and a `config_error` string consumed by the `<AIStatusPill>` and the AI-status banner.

### Language consistency
- New `detectLanguage()` recognises `english | hindi | hinglish` from the user's input.
- Every AI prompt now contains "DETECTED INPUT LANGUAGE: <x>. You MUST respond in <x>".
- Verified: *"Mujhe vegan snacks chahiye jaldi"* → response *"Yahan par kuch vegan snacks hain..."*

### Better unavailable-product behaviour
- New `substituteScore` formula in `lib/agents/smartCartAgent.ts`:
  ```
  substituteScore =
    0.30 * sameCategoryScore +
    0.25 * preferenceMatchScore +
    0.20 * availabilityScore +
    0.10 * etaScore +
    0.10 * ratingTrustScore +
    0.05 * priceSimilarityScore
  ```
- Threshold: substitutes below 0.45 are not shown — we'd rather say "no relevant substitute available".
- Vegan / Jain / vegetarian violations are blocked even before scoring.

### Scheduled orders
- New `lib/scheduledOrders.tsx` provider (localStorage).
- `/scheduled-orders` page with full lifecycle: create / edit / pause / resume / skip-next / delete.
- Frequencies: daily, alternate, weekly, custom days, every N days, monthly.
- Trust controls: confirm-before-each-run + substitute policy (auto/ask/never).
- API stubs at `/api/schedules` and `/api/schedules/[id]` document the production path (EventBridge Scheduler + Lambda + DynamoDB + Amazon Pay).

### Onboarding skip — fixed
- Clicking "Skip onboarding" on the top bar OR "Skip for now" on the welcome step **goes directly to /** and marks `onboardingComplete=true` with `personalizationEnabled=false`.
- The auto-redirect guard no longer pulls the user back to `/onboarding`.
- Personalisation is editable later from Profile → Preferences → "Edit preferences".

### Smarter undo
- ≤ ₹500 → 5-second window, no skip option.
- > ₹500 → 10-second window with an explicit **Confirm now** button (green, top-right of the toast).
- Visual countdown ring + remaining seconds in the centre.

### Bigger, more professional homepage
14 sections matching real quick-commerce homepages (Zepto/Blinkit feel) without copying their UI:
1. Hero with logo + tagline + AI status pill
2. Welcome / undo banner
3. Delivery + dark-store strip
4. Search + voice + chips
5. Quick actions (voice, list, voice note, camera scan, packet, emergency, schedule)
6. Shop by category (16 categories with badges)
7. Personalised for you
8. Predicted reorder
9. Emergency kits (8 cards)
10. Guided journeys (8 cards)
11. Pulse Upload (4 tiles: list / packet / photo / voice note)
12. Scheduled orders panel
13. Smart combos
14. Why Pulse Now stats + Privacy & trust + footer

### Theme toggle
- Setting in Feature Panel → Settings → Appearance.
- Light by default (matches Amazon).
- All colours via CSS variables on `<html data-theme>`. No flash thanks to a `<head>` boot script.

---

## Setup

```bash
npm install
npm run dev
# open http://localhost:3000
```

`.env.local` is already wired. Rotate the AWS keys after the demo (IAM → Users → Security credentials).

### About "Claude Sonnet 4.6" — important honest note

Anthropic has not released a model called **Sonnet 4.6** at the time of this build. The latest real Bedrock model is **`anthropic.claude-sonnet-4-5-20250929-v1:0`**. The codebase is wired to use whatever model id is in `BEDROCK_MODEL_ID`, so flipping to a future 4.6 is a one-line env change.

### Today's default: Amazon Nova Lite, not Claude

Your AWS account currently returns:
```
INVALID_PAYMENT_INSTRUMENT — A valid payment instrument must be provided.
Your AWS Marketplace subscription for this model cannot be completed at this time.
```

That's a billing-side issue (Anthropic models on Bedrock require a card on file because they go through AWS Marketplace). I switched the default to `amazon.nova-lite-v1:0` so the demo works today. To re-enable Claude:

1. AWS Console → top-right account → **Billing and Cost Management** → **Payment methods** → add a card.
2. Wait ~2 minutes.
3. Bedrock console → **Model access** → make sure Anthropic Claude Sonnet 4.5 says "Access granted".
4. In `.env.local` set:
   ```
   BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-5-20250929-v1:0
   ```
5. Restart `npm run dev`.

---

## Routes

| Route | Purpose |
|---|---|
| `/onboarding` | Spotify-style profile capture; **Skip** goes straight to home |
| `/` | Big quick-commerce homepage with 14 sections |
| `/chat` | Conversational Pulse AI |
| `/intent` | SmartCards + parallel AI cart |
| `/guided` | AI-driven Q&A, builds a kit |
| `/emergency` | Tiered emergency situations |
| `/emergency/custom` | Free-form Bedrock kit builder |
| `/upload` | Photo / handwritten list / voice note (renamed from /scan) |
| `/scan` | Redirect to `/upload` (legacy) |
| `/scheduled-orders` | Auto-reorder schedule manager |
| `/checkout` | Editable cart, OneConfirm |
| `/order-success` | Tracking + dynamic undo (5s ≤ ₹500, 10s with Confirm now > ₹500) |
| `/dashboard` | Architecture + ranking math |
| `/pitch` | Story-mode deck |

API routes:
`/api/chat`, `/api/smart-cart`, `/api/recommend`, `/api/guided`, `/api/emergency-tiers`, `/api/predict-reorder`, `/api/scan-list`, `/api/scan-product`, `/api/explain`, `/api/checkout`, `/api/understand-intent`, `/api/upload/voice-note`, `/api/vision/scan-list`, `/api/vision/scan-product`, `/api/schedules`, `/api/schedules/[id]`.

---

## Testing checklist

| Feature | How to test | Pass criteria |
|---|---|---|
| Mobile upload bug | On phone, open `/upload`, tap **Upload from Device** | Gallery opens, NOT camera. Selecting a JPG/PNG returns AI matches. |
| Camera scan | On phone or laptop with webcam, tap **Camera Scan** | Permission prompt → live video → Snap → AI matches. |
| Vision failure | Upload a 7 MB image | Toast says "Image is X MB. Max allowed is 6 MB." (no silent mock). |
| Voice note | `/upload?mode=voice` → choose a sample → Submit | Picks render in detected language, NIC items shown separately. |
| Skip onboarding | Fresh browser → land on `/onboarding` → Skip onboarding | Lands on `/` directly. Banner: "Onboarding skipped — you can personalise from Settings." |
| Mock-mode toggle | Set `USE_MOCK_AI=true`, restart, force a Bedrock failure | Falls back to deterministic match. With `false`, fails loudly. |
| AI active mode | `/api/chat` returns `bedrock_enabled: true, mock_allowed: false` | Confirmed in network tab and AI status pill. |
| Language match | Type *"Mujhe vegan snacks chahiye"* in `/chat` | Reply is in Hinglish. |
| Substitute logic | Type *"diapers, baby formula, organic baby food, stroller"* | 4 catalog picks + 4 NIC items, no irrelevant substitutes. |
| Schedule milk | `/scheduled-orders` → New → Amul milk × 2, Alternate days, 17:00 | Card saved; "Next:" date is tomorrow at 5 PM (or +2 days). |
| Undo ≤ ₹500 | Place a < ₹500 order | 5-second timer ring, no Confirm now button. |
| Undo > ₹500 | Place a > ₹500 order | 10-second timer ring + green **Confirm now** button. |
| Theme toggle | Profile → Settings → Appearance | Switching Light/Dark instantly flips colours. |

---

## File map (changes in v1.4)

```
NEW:
  app/upload/page.tsx                Renamed from /scan; separate Upload-from-device + Camera + Voice tabs
  app/scan/page.tsx                  Redirects to /upload
  app/scheduled-orders/page.tsx      Schedule manager
  app/api/upload/voice-note/route.ts Voice-note → cart pipeline
  app/api/schedules/route.ts         Production-shape contract
  app/api/schedules/[id]/route.ts
  components/UnavailableSection.tsx  (also used in voice-note results)
  lib/agents/language.ts             Hinglish/Hindi/English detector
  lib/scheduledOrders.tsx            Provider + computeNextRunAt
  data/voiceNoteSamples.json
  data/categoryVisuals.json
  data/scheduledOrders.json

MODIFIED:
  app/page.tsx                       14-section homepage
  app/onboarding/page.tsx            Skip-all path that goes home
  app/order-success/page.tsx         Wires UndoToast with order total
  app/api/chat/route.ts              Forwards preferences
  app/layout.tsx                     Adds ScheduledOrdersProvider
  components/AppShell.tsx            Renames Scan → Upload in nav
  components/UndoToast.tsx           Dynamic timing + Confirm now
  lib/aws/bedrockClient.ts           USE_MOCK_AI flag, no silent fallback, real-error humanise
  lib/agents/smartCartAgent.ts       Language detection + substituteScore
  lib/agents/chatAgent.ts            Same-language output rule
  lib/agents/visionAgent.ts          Real error surfaces; voice-note pipeline
  lib/agents/index.ts                Re-exports
  .env.local                         USE_MOCK_AI flag, sane defaults
```

---

## Known billing-side caveat

Anthropic Claude on Bedrock requires a valid payment method on the AWS account (it goes through AWS Marketplace). On accounts where billing isn't set up, calls return `INVALID_PAYMENT_INSTRUMENT`. Two fixes:

- **Add a card** in AWS → Billing → Payment methods, then switch `BEDROCK_MODEL_ID` back to Claude Sonnet 4.5.
- **Or stay on Amazon Nova Lite** (default). It's cheap, Amazon-native, and supports vision + JSON output well enough for the demo.

---

## License

MIT — built for Amazon HackOn 6.0.
