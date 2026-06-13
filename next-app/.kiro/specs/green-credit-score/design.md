# Design Document — Green Credit Score

## Overview

The Green Credit Score (GCS) feature adds a buyer-facing sustainability reward system to the ReLoop platform. It tracks eco-friendly actions (returns with good disposition outcomes, marketplace purchases, sustainable shipping choices) and converts them into a clamped integer score [0, 1000]. The score maps to four badge tiers, unlocks milestone vouchers, and is surfaced in the Nav bar, on a dedicated profile page, in the return flow, and on the Ops Dashboard.

The entire feature is implemented as a module-level in-memory store — the same pattern used by `listingFlags` in `lib/static-data.ts` — which satisfies the Vercel serverless constraint (no filesystem, no database at runtime). All credit computation is pure: the GCS is always derived by re-summing the buyer's `Action_Log`, so there is no risk of the score drifting out of sync with the event history.

### Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| State storage | Module-level `Map` in `lib/green-credit-engine.ts` | Matches existing `listingFlags` pattern; works on Vercel serverless |
| Score recalculation | Synchronous, derived from `Action_Log` sum | No async paths needed; ensures consistency between log and score |
| Idempotency | `processedEventIds: Set<string>` per buyer | Prevents duplicate credit awards on retry without a DB transaction |
| Widget refresh | `setInterval` polling at 5 000 ms (optimistic update on known actions) | No WebSockets; simple and reliable for this use case |
| Voucher expiry | Checked at read time (`getVoucherStatus`) | Avoids a background cron job; compatible with serverless cold starts |
| Green credits for disposition | Override `GREEN_CREDITS_MAP` in `ev-optimizer.ts` with requirements-specified values | Single source of truth; keeps existing `DispositionResult.green_credits` field |
| Credit_Engine integration with return flow | Return API (`POST /api/disposition`) calls `recordAction` after computing disposition | Credits awarded atomically with disposition decision |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js App Router                        │
│                                                                  │
│  ┌─────────────────┐   ┌──────────────────┐  ┌───────────────┐  │
│  │  app/return/    │   │  app/profile/    │  │  app/         │  │
│  │  page.tsx       │   │  green-score/    │  │  dashboard/   │  │
│  │  (nudge inject) │   │  page.tsx        │  │  page.tsx     │  │
│  └────────┬────────┘   └────────┬─────────┘  └──────┬────────┘  │
│           │                    │                    │            │
│  ┌────────▼────────────────────▼────────────────────▼────────┐  │
│  │                     API Routes                             │  │
│  │  POST /api/disposition  (existing, updated)                │  │
│  │  GET  /api/green-credit/[buyerId]                          │  │
│  │  POST /api/green-credit/action                             │  │
│  │  GET  /api/dashboard        (existing, extended)           │  │
│  └─────────────────────────────┬──────────────────────────────┘  │
│                                │                                  │
│  ┌─────────────────────────────▼──────────────────────────────┐  │
│  │              lib/green-credit-engine.ts                     │  │
│  │  (pure functions + module-level in-memory store)            │  │
│  │                                                             │  │
│  │  GCS_STORE: Map<buyerId, BuyerGCSRecord>                    │  │
│  │  computeGCS()   assignBadgeTier()   computeActionCredits()  │  │
│  │  recordAction() checkMilestones()   getVoucherStatus()      │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              components/                                    │  │
│  │  ScoreWidget.tsx    GCSProfilePage.tsx (page component)     │  │
│  │  ReturnNudgeBanner.tsx                                      │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Return action**: `POST /api/disposition` → `computeEV()` → `recordAction(buyerId, {type:'return', disposition, circularityScore, eventId, orderId})` → GCS updated synchronously → response includes `green_credits` delta.
2. **Marketplace purchase**: `POST /api/marketplace/purchase` (new) or triggered client-side → `POST /api/green-credit/action` with `actionType:'marketplace_purchase'`.
3. **Shipping choice**: Checkout step calls `POST /api/green-credit/action` with `actionType:'shipping_consolidated'` or `'shipping_carbon_offset'`.
4. **Widget reads**: `ScoreWidget` polls `GET /api/green-credit/[buyerId]` every 5 000 ms (or uses optimistic update on known actions).
5. **Dashboard reads**: `GET /api/dashboard` now calls `getGCSAggregate()` from the engine to compute tier breakdown and voucher count.

---

## Components and Interfaces

### 1. TypeScript Types — `types/index.ts` (additions)

```ts
// ── New types to add ─────────────────────────────────────────────

export type BadgeTier = "Seedling" | "Sprout" | "EcoChampion" | "Guardian";

export type EcoActionType =
  | "return_refurbish"
  | "return_resell"
  | "return_donate"
  | "return_recycle"
  | "return_exchange"
  | "marketplace_purchase"
  | "shipping_consolidated"
  | "shipping_carbon_offset"
  | "deduction_discretionary_return";

export interface EcoAction {
  id: string;                  // UUID, used as idempotency key
  actionType: EcoActionType;
  delta: number;               // signed integer (positive = award, negative = deduction)
  timestamp: string;           // UTC ISO-8601
  entityId: string;            // orderId, listingId, or productId
  description: string;         // human-readable label for the Action_Log display
}

export interface GreenVoucher {
  id: string;                  // UUID
  code: string;                // e.g. "GCS-5F3A-2026"
  milestoneGCS: number;        // 200 | 500 | 800 | 1000
  discountPct: number;         // 5 | 10 | 15 | 20
  issuedAt: string;            // UTC ISO-8601
  expiresAt: string;           // issuedAt + 90 calendar days
  status: "active" | "expired";
}

export interface BuyerGCSRecord {
  buyerId: string;
  actionLog: EcoAction[];
  vouchers: GreenVoucher[];
  processedEventIds: Set<string>;   // idempotency set
  milestonesReached: Set<number>;   // which milestone GCS values have been crossed
}

export interface GCSResponse {
  buyerId: string;
  gcs: number;                      // current clamped score [0, 1000]
  badgeTier: BadgeTier;
  actionLog: EcoAction[];           // reverse-chronological
  vouchers: GreenVoucher[];         // with live status
}

export interface GCSAggregate {
  totalVouchersIssued: number;
  monthlyCreditsEarned: number;
  tierCounts: Record<BadgeTier, number>;
}

export interface PostActionRequest {
  buyerId: string;
  actionType: EcoActionType;
  entityId: string;
  eventId: string;              // caller-supplied idempotency key
  metadata?: {
    disposition?: DispositionResult["decision"];
    circularityScore?: number;
    returnReason?: string;
    deliveryTimestamp?: string; // ISO-8601; used for 72h window check on deductions
  };
}

export interface PostActionResponse {
  success: boolean;
  delta: number;
  newGCS: number;
  newBadgeTier: BadgeTier;
  vouchersGenerated: GreenVoucher[];
}
```

### 2. Credit Engine — `lib/green-credit-engine.ts`

This is the core pure-logic + state module. All functions except `recordAction` are pure (no side effects).

```ts
// ── In-memory store (module-level — same pattern as listingFlags) ──
const GCS_STORE = new Map<string, BuyerGCSRecord>();

// ── Pure helpers ──────────────────────────────────────────────────

/**
 * Returns the credit delta for a return action based on disposition.
 * Pure function: (disposition) → number
 */
export function computeReturnCredits(
  disposition: DispositionResult["decision"]
): number;

/**
 * Returns the credit delta for a given action type.
 * Pure function: (actionType, metadata) → number
 * Handles circularity bonus and discretionary deduction rules internally.
 */
export function computeActionCredits(
  actionType: EcoActionType,
  metadata?: PostActionRequest["metadata"]
): number;

/**
 * Computes the GCS from an action log.
 * Pure function: (actions) → number in [0, 1000]
 */
export function computeGCS(actions: EcoAction[]): number;

/**
 * Assigns a badge tier from a GCS value.
 * Pure function: (gcs) → BadgeTier
 */
export function assignBadgeTier(gcs: number): BadgeTier;

/**
 * Returns milestones (200|500|800|1000) that the new GCS crosses
 * for the first time, given the set of already-reached milestones.
 * Pure function: (oldGCS, newGCS, milestonesReached) → number[]
 */
export function computeNewMilestones(
  oldGCS: number,
  newGCS: number,
  milestonesReached: Set<number>
): number[];

/**
 * Generates a GreenVoucher for the given milestone.
 * Pure function: (milestoneGCS, now) → GreenVoucher
 */
export function generateVoucher(
  milestoneGCS: number,
  now: Date
): GreenVoucher;

/**
 * Returns live status of a voucher — checks expiry at call time.
 * Pure function: (voucher, now) → "active" | "expired"
 */
export function getVoucherStatus(
  voucher: GreenVoucher,
  now?: Date
): "active" | "expired";

/**
 * Returns whether the given return reason qualifies for a nudge.
 * Pure function: (reason) → boolean
 */
export function isDiscretionaryReturn(reason: string): boolean;

/**
 * Returns whether an action is within the 72-hour deduction window.
 * Pure function: (deliveryTimestamp, actionTimestamp) → boolean
 */
export function isWithin72Hours(
  deliveryTimestamp: string,
  actionTimestamp: string
): boolean;

// ── Stateful operations ───────────────────────────────────────────

/**
 * Records an EcoAction for a buyer. Handles idempotency, GCS recomputation,
 * milestone checking, and voucher generation.
 * Returns: delta applied, new GCS, badge tier, and any generated vouchers.
 * If eventId is already processed, returns current state with delta=0.
 */
export function recordAction(
  request: PostActionRequest
): PostActionResponse;

/**
 * Returns the full GCS record for a buyer (creates empty record if new).
 * Returns live-status vouchers (expiry checked at call time).
 */
export function getBuyerGCS(buyerId: string): GCSResponse;

/**
 * Returns aggregate stats for the dashboard.
 */
export function getGCSAggregate(): GCSAggregate;

/**
 * Initialises or resets a buyer record (used for seeded demo data).
 */
export function seedBuyerGCS(
  buyerId: string,
  actions: Omit<EcoAction, "id">[]
): void;
```

**Credit Award Table** (implemented inside `computeActionCredits`):

| `actionType` | Base delta |
|---|---|
| `return_refurbish` | +50 |
| `return_resell` | +50 |
| `return_donate` | +30 |
| `return_recycle` | +20 |
| `return_exchange` | +10 |
| `marketplace_purchase` | +40 |
| `shipping_consolidated` | +15 |
| `shipping_carbon_offset` | +25 |
| `deduction_discretionary_return` (within 72h) | −10 |

**Bonus**: if `metadata.circularityScore >= 70`, add +10 on top of any return action type.

**Floor**: after deduction, `newGCS = Math.max(0, prevGCS - 10)` enforced inside `computeGCS`.

### 3. API Routes

#### `app/api/green-credit/[buyerId]/route.ts`

```ts
export async function GET(
  _req: NextRequest,
  { params }: { params: { buyerId: string } }
): Promise<NextResponse>
```

- Validates `buyerId` exists in `BUYERS` array from `lib/data.ts`.
- Returns 404 with `{ error: "Buyer not found" }` if invalid.
- Calls `getBuyerGCS(buyerId)` → returns `GCSResponse` as JSON.
- Sets `Content-Type: application/json`.

#### `app/api/green-credit/action/route.ts`

```ts
export async function POST(req: NextRequest): Promise<NextResponse>
```

- Parses `PostActionRequest` from body.
- Validates `buyerId`, `actionType`, `entityId`, `eventId` are present.
- Returns 400 with `{ error: "..." }` for missing/invalid fields.
- Returns 404 if `buyerId` not in `BUYERS`.
- Calls `recordAction(request)` → returns `PostActionResponse` as JSON.

#### `app/api/dashboard/route.ts` (extended)

The existing `GET` handler is extended to include GCS aggregate data:

```ts
return NextResponse.json({
  ...SEEDED,
  flagged_listings: flaggedListings,
  // New GCS aggregate fields:
  gcs_total_vouchers_issued: aggregate.totalVouchersIssued,
  gcs_monthly_credits_earned: aggregate.monthlyCreditsEarned,
  gcs_tier_counts: aggregate.tierCounts,
});
```

#### `app/api/disposition/route.ts` (updated)

After `computeEV()`, call `recordAction` with the appropriate return action type:

```ts
// After computing disposition result:
const actionType = `return_${result.decision}` as EcoActionType;
recordAction({
  buyerId: body.buyer_id ?? "b001",   // default to demo buyer if not provided
  actionType,
  entityId: body.product_id,
  eventId: `disposition-${body.order_id ?? body.product_id}-${Date.now()}`,
  metadata: {
    disposition: result.decision,
    circularityScore: result.circularity_score,
    returnReason: body.return_reason,
    deliveryTimestamp: body.delivery_timestamp,
  },
});
```

The `green_credits` field in `DispositionResult` is updated to return the engine's computed delta (replacing the static `GREEN_CREDITS_MAP` in `ev-optimizer.ts`).

### 4. UI Components

#### `components/ScoreWidget.tsx`

```tsx
// Props accepted when rendered contextually on product/result pages
interface ScoreWidgetProps {
  buyerId?: string;
  mode?: "nav" | "inline";            // "nav" = compact pill in NavBar
  estimatedCredits?: number;          // shown on product pages
  awardedCredits?: number;            // shown on return result screen
}

export default function ScoreWidget(props: ScoreWidgetProps): JSX.Element
```

- Fetches `GET /api/green-credit/[buyerId]` on mount and every 5 000 ms via `setInterval`.
- Default `buyerId` is `"b001"` (demo buyer) until buyer auth is implemented.
- In `"nav"` mode renders: score integer + badge icon in a compact pill (replacing the "AI Live" badge slot on the right-hand side of `Nav.tsx`).
- Links to `/profile/green-score` on click.
- Uses `useOptimistic` (React 19) or a local `pendingDelta` state for optimistic updates when a return/purchase action is confirmed.

**Visual spec (nav mode)**:
```
┌─────────────────────────────┐
│  🌱  247 pts  · Sprout  →   │
└─────────────────────────────┘
```
Pill styles: `background: #18181b`, `border: 1px solid #27272a`, badge icon is emoji based on tier (🌱 Seedling, 🌿 Sprout, 🏆 EcoChampion, 🛡️ Guardian), text `color: #10b981`.

#### `components/ReturnNudgeBanner.tsx`

```tsx
interface ReturnNudgeBannerProps {
  reason: string;
  deductionAmount?: number;   // defaults to 10
}

export default function ReturnNudgeBanner(props: ReturnNudgeBannerProps): JSX.Element | null
```

- Returns `null` if `isDiscretionaryReturn(reason)` is `false`.
- Renders a non-blocking amber banner (matching existing PreventionBanner styling) with: `"⚠️ Heads up: confirming this return will deduct 10 green credits from your score."`.
- No confirm/cancel buttons — the return flow proceeds regardless.

**Injection point in `app/return/page.tsx`**: rendered between the reason selection button click and the `setStep("upload")` transition:

```tsx
// In the reason step, after setting reason:
onClick={() => { setReason(r.value); setStep("upload"); }}

// Banner renders above the upload step when reason is set:
{reason && <ReturnNudgeBanner reason={reason} />}
```

#### `app/profile/green-score/page.tsx`

Full-page client component. Fetches `GET /api/green-credit/[buyerId]` on mount.

**Layout sections**:
1. **Hero card**: circular SVG progress ring (0–1000 scale), GCS integer, badge tier label + icon.
2. **Badge tier card**: current tier description, progress to next milestone (e.g. "253 credits to EcoChampion").
3. **Vouchers section**: grid of `GreenVoucher` cards (code, discount%, expiry, status badge).
4. **Action log**: chronological list, each entry shows `description`, `delta` (signed, green for positive, red for negative), and formatted timestamp.
5. **Empty state**: GCS=0 with Seedling badge and call-to-action card if log is empty.

**Progress ring formula**:
```ts
const milestones = [0, 200, 500, 800, 1000];
const tierMin = milestones[tierIndex];
const tierMax = milestones[tierIndex + 1];
const pct = ((gcs - tierMin) / (tierMax - tierMin)) * 100;
// SVG circle: circumference = 2πr, strokeDasharray = `${pct * circ / 100} ${circ}`
```

---

## Data Models

### In-Memory Store Structure

```ts
// Module-level in lib/green-credit-engine.ts
const GCS_STORE = new Map<string, BuyerGCSRecord>();
// Key: buyerId (e.g. "b001")
// Value: BuyerGCSRecord (see types above)
```

The store is initialised empty. On first access for any `buyerId`, `getBuyerGCS` creates a fresh `BuyerGCSRecord`:

```ts
{
  buyerId,
  actionLog: [],
  vouchers: [],
  processedEventIds: new Set(),
  milestonesReached: new Set(),
}
```

### GCS Computation (pure)

```ts
const MILESTONES = [200, 500, 800, 1000] as const;
const MILESTONE_DISCOUNTS: Record<number, number> = {
  200: 5, 500: 10, 800: 15, 1000: 20,
};
const BADGE_TIERS: [BadgeTier, number, number][] = [
  ["Seedling",    0,   199],
  ["Sprout",      200, 499],
  ["EcoChampion", 500, 799],
  ["Guardian",    800, 1000],
];

function computeGCS(actions: EcoAction[]): number {
  const raw = actions.reduce((sum, a) => sum + a.delta, 0);
  return Math.max(0, Math.min(1000, raw));
}

function assignBadgeTier(gcs: number): BadgeTier {
  for (const [tier, min, max] of BADGE_TIERS) {
    if (gcs >= min && gcs <= max) return tier;
  }
  return "Seedling"; // unreachable if gcs is [0,1000]
}
```

### Voucher Code Generation

```ts
function generateVoucherCode(milestoneGCS: number, issuedAt: Date): string {
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  const year = issuedAt.getFullYear();
  return `GCS${milestoneGCS}-${suffix}-${year}`;
  // e.g. "GCS200-4F3A-2026"
}
```

### Seeded Demo Data

To demonstrate the feature on first load, `seedBuyerGCS` is called from `lib/static-data.ts` for buyers `b001`–`b003` with pre-built action sequences that place them in different tiers:

| Buyer | Seeded GCS | Badge Tier |
|---|---|---|
| b001 (Ankit) | 320 | Sprout |
| b002 (Priya) | 550 | EcoChampion |
| b003 (Rohan) | 85  | Seedling |

Remaining buyers `b004`–`b010` start at GCS=0 (Seedling).

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Disposition-to-credits mapping is exact

*For any* return action where the disposition decision is one of `{refurbish, resell, donate, recycle, exchange}`, the base credit delta returned by `computeReturnCredits` SHALL equal exactly 50, 50, 30, 20, and 10 respectively, with an additional +10 when `circularityScore >= 70`.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.8**

### Property 2: Shipping action credits are exact

*For any* action with `actionType` equal to `shipping_consolidated` or `shipping_carbon_offset`, the delta returned by `computeActionCredits` SHALL equal 15 and 25 respectively.

**Validates: Requirements 1.6, 1.7**

### Property 3: GCS is always clamped to [0, 1000]

*For any* sequence of EcoActions (of any length, with any mix of positive and negative deltas), `computeGCS(actions)` SHALL always return a value in the closed interval [0, 1000].

**Validates: Requirements 2.1**

### Property 4: Badge tier assignment covers the entire [0, 1000] domain

*For any* integer GCS value in [0, 1000], `assignBadgeTier(gcs)` SHALL return exactly one of the four tiers and the returned tier's range SHALL contain the input GCS. No two tiers overlap and the four ranges are exhaustive.

**Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.7**

### Property 5: GCS computation is deterministic (round-trip)

*For any* `BuyerGCSRecord`, calling `computeGCS(record.actionLog)` twice in succession SHALL return the same value. Recomputing from the same action log is always idempotent.

**Validates: Requirements 2.7**

### Property 6: Each milestone generates exactly one voucher

*For any* sequence of actions that causes a buyer's GCS to cross a milestone value M for the first time, the buyer's `vouchers` array SHALL contain exactly one voucher with `milestoneGCS === M`. Crossing the same milestone again (e.g. score dips and rises) SHALL NOT generate a second voucher.

**Validates: Requirements 3.1, 3.2**

### Property 7: Voucher discount values are exact

*For any* milestone in `{200, 500, 800, 1000}`, the generated voucher's `discountPct` SHALL equal 5, 10, 15, and 20 respectively.

**Validates: Requirements 3.3, 3.4, 3.5, 3.6**

### Property 8: Every recorded action appears in the action log

*For any* `PostActionRequest` that is accepted (not a duplicate), after `recordAction` returns, `getBuyerGCS(buyerId).actionLog` SHALL contain an entry whose `id` matches `request.eventId`, `actionType` matches `request.actionType`, and `delta` matches the computed credit amount.

**Validates: Requirements 1.10**

### Property 9: Action recording is idempotent

*For any* valid `PostActionRequest` with a given `eventId`, calling `recordAction` once SHALL produce a GCS equal to GCS₀ + delta. Calling `recordAction` again with the same `eventId` SHALL leave the GCS unchanged (i.e., GCS after second call === GCS after first call).

**Validates: Requirements 1.11**

### Property 10: API round-trip preserves GCS delta

*For any* valid `buyerId` and valid `PostActionRequest`, the GCS returned by `GET /api/green-credit/[buyerId]` after a `POST /api/green-credit/action` SHALL equal `clamp(GCS_before + delta, 0, 1000)` where `GCS_before` is the GCS from a `GET` immediately before the `POST`.

**Validates: Requirements 7.6**

### Property 11: Discretionary return nudge is shown iff reason is discretionary

*For any* `return_reason` string, `isDiscretionaryReturn(reason)` SHALL return `true` if and only if `reason` is in `{"changed_mind", "wrong_variant"}`. For all other reason values, it SHALL return `false`.

**Validates: Requirements 6.1, 6.2**

### Property 12: Dashboard tier counts partition all buyers

*For any* state of `GCS_STORE`, the sum of `tierCounts.Seedling + tierCounts.Sprout + tierCounts.EcoChampion + tierCounts.Guardian` returned by `getGCSAggregate()` SHALL equal the total number of buyers who have a GCS record, and each buyer SHALL be counted in exactly one tier.

**Validates: Requirements 8.3**

### Property 13: Action log is reverse-chronological

*For any* buyer's action log as returned by `getBuyerGCS`, the entries SHALL be sorted in descending order by `timestamp` (most recent first). For any two consecutive entries `a[i]` and `a[i+1]`, `a[i].timestamp >= a[i+1].timestamp`.

**Validates: Requirements 4.3**

---

## Error Handling

### API Layer

| Condition | HTTP Status | Response body |
|---|---|---|
| `buyerId` not in `BUYERS` list | 404 | `{ error: "Buyer not found", buyerId }` |
| Missing `actionType` in POST body | 400 | `{ error: "actionType is required" }` |
| Invalid `actionType` value | 400 | `{ error: "Invalid actionType", received: "...", valid: [...] }` |
| Missing `eventId` in POST body | 400 | `{ error: "eventId is required for idempotency" }` |
| Missing `buyerId` in POST body | 400 | `{ error: "buyerId is required" }` |
| Duplicate `eventId` (already processed) | 200 | `{ success: true, delta: 0, newGCS: ..., message: "duplicate_event_skipped" }` |
| Internal engine error | 500 | `{ error: "Internal error" }` |

### Client Layer

- `ScoreWidget`: displays last known score on fetch failure; shows a subtle error indicator (reduced opacity) rather than crashing.
- `app/profile/green-score/page.tsx`: shows a skeleton loader while fetching; renders an error card with retry button on fetch failure.
- `ReturnNudgeBanner`: renders nothing (null) on any error — does not block the return flow.

### Engine Layer

- `recordAction` never throws: returns `{ success: false, delta: 0, newGCS: currentGCS, ... }` on unexpected input.
- `computeGCS` handles empty action logs: returns 0.
- `getBuyerGCS` handles unknown `buyerId` by returning a fresh empty record (GCS=0, Seedling) rather than throwing.

---

## Testing Strategy

### Overview

The testing strategy uses a dual approach:
- **Unit/example tests**: verify specific edge cases, error conditions, and integration points.
- **Property-based tests**: verify universal invariants across all valid inputs, using [fast-check](https://github.com/dubzzz/fast-check) (the standard PBT library for TypeScript).

All property tests are configured with a minimum of **100 iterations** (fast-check default is 100 runs; set `numRuns: 200` for critical properties).

### Property-Based Tests

Each property test is tagged with a comment referencing its design property:
`// Feature: green-credit-score, Property N: <property text>`

**Test file**: `lib/__tests__/green-credit-engine.property.test.ts`

```ts
import fc from "fast-check";
import {
  computeReturnCredits, computeActionCredits, computeGCS,
  assignBadgeTier, recordAction, getBuyerGCS, isDiscretionaryReturn,
  getGCSAggregate
} from "../green-credit-engine";

// PBT-1: Disposition-to-credits mapping — disposition credits are exact
test("disposition base credits match requirements table", () => {
  const table: [string, number][] = [
    ["refurbish", 50], ["resell", 50], ["donate", 30],
    ["recycle", 20], ["exchange", 10],
  ];
  fc.assert(fc.property(
    fc.constantFrom(...table),
    fc.integer({ min: 0, max: 100 }),
    ([disposition, expected], circularity) => {
      const bonus = circularity >= 70 ? 10 : 0;
      const delta = computeReturnCredits(disposition as any, circularity);
      return delta === expected + bonus;
    }
  ), { numRuns: 200 });
});

// PBT-3: GCS clamp invariant — GCS always in [0,1000]
test("GCS is always clamped to [0,1000]", () => {
  fc.assert(fc.property(
    fc.array(fc.integer({ min: -50, max: 100 }), { minLength: 0, maxLength: 50 }),
    (deltas) => {
      const actions = deltas.map((d, i) => ({
        id: `e${i}`, actionType: "return_resell" as any,
        delta: d, timestamp: new Date().toISOString(),
        entityId: "p001", description: "test",
      }));
      const gcs = computeGCS(actions);
      return gcs >= 0 && gcs <= 1000;
    }
  ), { numRuns: 200 });
});

// PBT-4: Badge tier covers full domain — defined for all GCS values in [0,1000]
test("assignBadgeTier covers [0,1000] without gaps or overlaps", () => {
  fc.assert(fc.property(
    fc.integer({ min: 0, max: 1000 }),
    (gcs) => {
      const tier = assignBadgeTier(gcs);
      const RANGES: Record<string, [number, number]> = {
        Seedling: [0, 199], Sprout: [200, 499],
        EcoChampion: [500, 799], Guardian: [800, 1000],
      };
      const [min, max] = RANGES[tier];
      return gcs >= min && gcs <= max;
    }
  ), { numRuns: 1000 });
});

// PBT-9: Action recording idempotency — duplicate eventId does not double-count credits
test("recording the same eventId twice does not change GCS", () => {
  fc.assert(fc.property(
    fc.uuid(),
    fc.constantFrom("return_resell", "marketplace_purchase", "shipping_consolidated"),
    (eventId, actionType) => {
      const buyerId = `test-${eventId}`;
      const req = { buyerId, actionType: actionType as any, entityId: "p001", eventId };
      const r1 = recordAction(req);
      const r2 = recordAction(req);
      return r1.newGCS === r2.newGCS && r2.delta === 0;
    }
  ), { numRuns: 100 });
});

// PBT-11: Discretionary return nudge predicate — true iff reason is changed_mind or wrong_variant
test("isDiscretionaryReturn is true exactly for discretionary reasons", () => {
  fc.assert(fc.property(
    fc.string(),
    (reason) => {
      const result = isDiscretionaryReturn(reason);
      const expected = reason === "changed_mind" || reason === "wrong_variant";
      return result === expected;
    }
  ), { numRuns: 200 });
});
```

### Unit / Example Tests

**Test file**: `lib/__tests__/green-credit-engine.unit.test.ts`

- Empty action log returns GCS=0, tier=Seedling
- Milestone voucher is generated exactly once on first crossing
- Voucher discount percentages for all four milestones
- Voucher expiry check: past-expiry voucher returns `"expired"`
- Expired voucher redemption returns error
- Unknown buyerId returns empty GCS record (not error)
- `computeNewMilestones` with GCS rising from 0→620 returns [200, 500]

### API Integration Tests

**Test file**: `app/api/__tests__/green-credit.test.ts`

- `GET /api/green-credit/nonexistent` → 404
- `POST /api/green-credit/action` with missing `actionType` → 400
- `POST /api/green-credit/action` with invalid `actionType` → 400
- Round-trip: GET → POST → GET confirms delta matches (Requirement 7.6)
- `GET /api/green-credit/b001` with seeded buyer → returns correct shape

### Dashboard Integration Tests

- `GET /api/dashboard` response includes `gcs_tier_counts`, `gcs_total_vouchers_issued`, `gcs_monthly_credits_earned`
- `gcs_tier_counts` values sum to total number of buyers with records

### Component Tests (React Testing Library)

- `ScoreWidget` renders with correct GCS integer and tier icon
- `ReturnNudgeBanner` returns null for non-discretionary reasons
- `ReturnNudgeBanner` renders nudge text for `changed_mind` and `wrong_variant`
- Profile page displays empty state when action log is empty
- Profile page action log is in reverse-chronological order
