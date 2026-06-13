# Implementation Plan: Green Credit Score

## Overview

Implement the Green Credit Score (GCS) feature as a module-level in-memory system on top of the existing ReLoop Next.js application. The implementation follows a strict bottom-up order: TypeScript types → pure credit engine → seeded demo data → API routes → existing-route updates → UI components → profile and dashboard pages → property-based and unit tests.

All state lives in a `Map` inside `lib/green-credit-engine.ts`, matching the existing `listingFlags` pattern in `lib/static-data.ts`. No database or filesystem access is required — the feature works within Vercel's serverless constraints.

---

## Tasks

- [x] 1. Set up testing framework and extend TypeScript types
  - [x] 1.1 Install Jest, ts-jest, and fast-check as dev dependencies
    - Run `npm install --save-dev jest ts-jest @types/jest fast-check`
    - Create `jest.config.ts` at the project root with `preset: 'ts-jest'`, `testEnvironment: 'node'`, and `moduleNameMapper` for the `@/` path alias
    - Add `"test": "jest --runInBand"` and `"test:run": "jest --runInBand --passWithNoTests"` scripts to `package.json`
    - Create `lib/__tests__/` directory (add a `.gitkeep` placeholder so the directory is committed)
    - _Requirements: all testing tasks below depend on this_

  - [x] 1.2 Add GCS TypeScript types to `types/index.ts`
    - Add `BadgeTier`, `EcoActionType`, `EcoAction`, `GreenVoucher`, `BuyerGCSRecord`, `GCSResponse`, `GCSAggregate`, `PostActionRequest`, `PostActionResponse` as specified in the design document §Components and Interfaces §1
    - `BuyerGCSRecord.processedEventIds` and `BuyerGCSRecord.milestonesReached` are `Set<string>` and `Set<number>` respectively
    - Export all new types from the existing `types/index.ts` file without removing any existing exports
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 2.1–2.7, 3.1–3.9_

- [x] 2. Implement the pure credit engine (`lib/green-credit-engine.ts`)
  - [x] 2.1 Implement pure helper functions
    - Create `lib/green-credit-engine.ts`
    - Define module-level constants: `CREDIT_TABLE` (action-type → base delta), `MILESTONES`, `MILESTONE_DISCOUNTS`, `BADGE_TIERS` as in the design §Data Models
    - Implement `computeReturnCredits(disposition, circularityScore?): number` — returns base delta from `CREDIT_TABLE` plus +10 bonus when `circularityScore >= 70`
    - Implement `computeActionCredits(actionType, metadata?): number` — delegates to `computeReturnCredits` for return types; returns fixed deltas for `marketplace_purchase`, `shipping_consolidated`, `shipping_carbon_offset`; returns −10 for `deduction_discretionary_return`
    - Implement `computeGCS(actions: EcoAction[]): number` — reduces deltas, clamps to [0, 1000]
    - Implement `assignBadgeTier(gcs: number): BadgeTier` — maps GCS to tier using `BADGE_TIERS` table
    - Implement `computeNewMilestones(oldGCS, newGCS, milestonesReached): number[]` — returns milestones in [200, 500, 800, 1000] crossed for the first time
    - Implement `generateVoucher(milestoneGCS, now): GreenVoucher` — generates UUID, voucher code (`GCS{milestone}-{4-char-random}-{year}`), sets `expiresAt` to `now + 90 days`, `status: "active"`
    - Implement `getVoucherStatus(voucher, now?): "active" | "expired"` — compares `voucher.expiresAt` to `now ?? new Date()`
    - Implement `isDiscretionaryReturn(reason: string): boolean` — returns `true` iff `reason === "changed_mind" || reason === "wrong_variant"`
    - Implement `isWithin72Hours(deliveryTimestamp, actionTimestamp): boolean` — returns `true` if difference is ≤ 72 × 3600 × 1000 ms
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7, 1.8, 1.9, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.3, 3.4, 3.5, 3.6, 6.1, 6.2_

  - [ ]* 2.2 Write property tests for pure helpers (Properties 1–5, 11)
    - Create `lib/__tests__/green-credit-engine.property.test.ts`
    - **Property 1: Disposition-to-credits mapping is exact** — `fc.constantFrom` over all disposition/circularity combos; assert `computeReturnCredits` returns exact base delta + bonus. **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.8**
    - **Property 2: Shipping action credits are exact** — assert `computeActionCredits("shipping_consolidated")` = 15 and `computeActionCredits("shipping_carbon_offset")` = 25 for all metadata. **Validates: Requirements 1.6, 1.7**
    - **Property 3: GCS always clamped to [0, 1000]** — `fc.array(fc.integer({min:-50,max:100}), {minLength:0, maxLength:50})`; build `EcoAction[]` and assert `computeGCS` result ∈ [0,1000]. **Validates: Requirement 2.1**
    - **Property 4: Badge tier covers full [0,1000] domain** — `fc.integer({min:0, max:1000})`; assert `assignBadgeTier(gcs)` returns a tier whose range contains `gcs`. **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.7**
    - **Property 5: GCS computation is deterministic** — call `computeGCS(actions)` twice with same input; assert results are equal. **Validates: Requirement 2.7**
    - **Property 11: Discretionary return nudge predicate** — `fc.string()`; assert `isDiscretionaryReturn` returns `true` iff reason is `"changed_mind"` or `"wrong_variant"`. **Validates: Requirements 6.1, 6.2**
    - Configure all property tests with `{ numRuns: 200 }` except Property 4 which uses `{ numRuns: 1000 }`

  - [x] 2.3 Implement stateful engine operations (`recordAction`, `getBuyerGCS`, `getGCSAggregate`, `seedBuyerGCS`)
    - Define module-level `const GCS_STORE = new Map<string, BuyerGCSRecord>()`
    - Implement `getBuyerGCS(buyerId: string): GCSResponse` — creates fresh record on first access; recomputes GCS from `actionLog`; applies `getVoucherStatus` to each voucher; returns log in reverse-chronological order
    - Implement `recordAction(request: PostActionRequest): PostActionResponse` — checks idempotency via `processedEventIds`; if duplicate, returns `{ success: true, delta: 0, newGCS, newBadgeTier, vouchersGenerated: [], message: "duplicate_event_skipped" }`; otherwise computes delta via `computeActionCredits`, builds `EcoAction`, pushes to `actionLog`, recomputes GCS, calls `computeNewMilestones`, generates vouchers, updates `milestonesReached`
    - Implement `getGCSAggregate(): GCSAggregate` — iterates `GCS_STORE`, counts tiers, sums credits earned in current calendar month, counts total vouchers issued
    - Implement `seedBuyerGCS(buyerId, actions)` — creates/resets record; calls `recordAction` for each seed action using a deterministic event ID (`seed-{buyerId}-{index}`)
    - Export all functions
    - _Requirements: 1.10, 1.11, 2.1, 2.6, 2.7, 3.1, 3.2, 3.7, 3.8, 8.1, 8.2, 8.3_

  - [ ]* 2.4 Write property tests for stateful operations (Properties 6, 8, 9, 12, 13)
    - Add to `lib/__tests__/green-credit-engine.property.test.ts`
    - **Property 6: Each milestone generates exactly one voucher** — drive a buyer's GCS past a milestone twice (via repeated actions); assert voucher count for that milestone === 1. **Validates: Requirements 3.1, 3.2**
    - **Property 8: Every accepted action appears in the action log** — after `recordAction`, `getBuyerGCS(buyerId).actionLog` contains an entry with matching `actionType` and `delta`. **Validates: Requirement 1.10**
    - **Property 9: Action recording is idempotent** — call `recordAction` with the same `eventId` twice; assert `r1.newGCS === r2.newGCS` and `r2.delta === 0`. **Validates: Requirement 1.11**
    - **Property 12: Dashboard tier counts partition all buyers** — after seeding N buyers, sum of all tier counts from `getGCSAggregate()` equals N. **Validates: Requirement 8.3**
    - **Property 13: Action log is reverse-chronological** — after recording multiple actions, all consecutive pairs in `actionLog` satisfy `a[i].timestamp >= a[i+1].timestamp`. **Validates: Requirement 4.3**

  - [ ]* 2.5 Write unit tests for edge cases
    - Create `lib/__tests__/green-credit-engine.unit.test.ts`
    - Test: empty action log → GCS = 0, tier = Seedling
    - Test: `computeNewMilestones` with GCS rising from 0 → 620 returns [200, 500] and not [800]
    - Test: milestone voucher discount percentages for all four milestones (5/10/15/20)
    - Test: `getVoucherStatus` with past-expiry date returns `"expired"`
    - Test: unknown `buyerId` via `getBuyerGCS` returns fresh empty record (GCS=0, Seedling, empty log) without throwing
    - Test: GCS deduction from `deduction_discretionary_return` never goes below 0 (floor)
    - Test: `recordAction` with non-return action type `marketplace_purchase` awards 40 credits
    - _Requirements: 1.9, 2.1, 2.2, 3.1, 3.3, 3.4, 3.5, 3.6, 3.8_

- [x] 3. Seed demo data in `lib/static-data.ts`
  - [x] 3.1 Add GCS seed calls at the bottom of `lib/static-data.ts`
    - Import `seedBuyerGCS` from `./green-credit-engine`
    - Call `seedBuyerGCS("b001", [...])` with a pre-built action sequence that results in GCS ≈ 320 (Sprout): e.g. 5 × `return_resell` (50 pts each) + 2 × `marketplace_purchase` (40 pts each) + 1 × `shipping_carbon_offset` (25 pts) = 345 pts
    - Call `seedBuyerGCS("b002", [...])` targeting GCS ≈ 550 (EcoChampion): e.g. 8 × `return_refurbish` + 3 × `marketplace_purchase` + 1 × `shipping_consolidated` = 535 pts
    - Call `seedBuyerGCS("b003", [...])` targeting GCS ≈ 85 (Seedling): e.g. 1 × `return_donate` (30 pts) + 1 × `return_recycle` (20 pts) + 1 × `deduction_discretionary_return` (−10 pts) = 40 pts (adjust counts to reach ~85)
    - Each seed action must have a unique deterministic `entityId` (e.g. `"seed-p001"`) and a timestamp in the past
    - Seed calls execute at module load time (top-level, outside any function), so both API routes and the UI share the same initialized store
    - _Requirements: 4.7, 5.1, 8.3_

- [x] 4. Create new API routes for green credit operations
  - [x] 4.1 Create `GET /api/green-credit/[buyerId]/route.ts`
    - Create file at `app/api/green-credit/[buyerId]/route.ts`
    - Import `getBuyerGCS` from `@/lib/green-credit-engine` and `BUYERS` from `@/lib/data`
    - Validate `buyerId` is present in the `BUYERS` array; return 404 `{ error: "Buyer not found", buyerId }` if not found
    - Call `getBuyerGCS(buyerId)` and return the result as JSON with `Content-Type: application/json`
    - On unexpected error, return 500 `{ error: "Internal error" }`
    - _Requirements: 7.1, 7.3, 7.5_

  - [x] 4.2 Create `POST /api/green-credit/action/route.ts`
    - Create file at `app/api/green-credit/action/route.ts`
    - Parse request body as `PostActionRequest`
    - Validate presence of `buyerId`, `actionType`, `entityId`, `eventId`; return 400 with descriptive messages for each missing field
    - Validate `actionType` against the `EcoActionType` union; return 400 with `{ error: "Invalid actionType", received, valid: [...] }` if unknown
    - Validate `buyerId` exists in `BUYERS`; return 404 if not
    - Call `recordAction(request)` and return `PostActionResponse` as JSON
    - On unexpected error, return 500 `{ error: "Internal error" }`
    - _Requirements: 7.2, 7.4, 7.5_

  - [ ]* 4.3 Write property test for API round-trip (Property 10)
    - Add to `lib/__tests__/green-credit-engine.property.test.ts` (or a dedicated API test file if using Next.js route testing utilities)
    - **Property 10: API round-trip preserves GCS delta** — for any valid `buyerId` and valid `PostActionRequest`, GCS after POST equals `clamp(GCS_before + delta, 0, 1000)`. Test via direct engine calls (`getBuyerGCS` → `recordAction` → `getBuyerGCS`) to avoid HTTP overhead in unit tests. **Validates: Requirement 7.6**

- [x] 5. Update existing routes to integrate the credit engine
  - [x] 5.1 Update `app/api/disposition/route.ts` to call `recordAction`
    - Import `recordAction` from `@/lib/green-credit-engine`
    - After `computeEV()` succeeds, determine `actionType` as `` `return_${result.decision}` as EcoActionType ``
    - Call `recordAction({ buyerId: body.buyer_id ?? "b001", actionType, entityId: body.product_id, eventId: `disposition-${body.order_id ?? body.product_id}-${Date.now()}`, metadata: { disposition: result.decision, circularityScore: result.circularity_score, returnReason: body.return_reason, deliveryTimestamp: body.delivery_timestamp } })`
    - Update the `green_credits` field in the response to use the `delta` returned by `recordAction` (so the return result screen shows the actual engine-computed value)
    - Also check if `isDiscretionaryReturn(body.return_reason)` is true; if so, additionally call `recordAction` with `actionType: "deduction_discretionary_return"` and a distinct `eventId`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.8, 1.9, 1.10, 1.11_

  - [x] 5.2 Update `app/api/dashboard/route.ts` to include GCS aggregate
    - Import `getGCSAggregate` from `@/lib/green-credit-engine`
    - Call `getGCSAggregate()` inside the `GET` handler
    - Spread the aggregate fields into the response JSON: `gcs_total_vouchers_issued`, `gcs_monthly_credits_earned`, `gcs_tier_counts`
    - Keep all existing `SEEDED` fields and `flagged_listings` unchanged
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 6. Checkpoint — Verify core engine and API
  - Ensure `npm run test:run` passes all tests in `lib/__tests__/`
  - Manually verify `GET /api/green-credit/b001` returns a valid `GCSResponse` with GCS ≈ 320 (seeded)
  - Manually verify `POST /api/green-credit/action` with a valid body returns `PostActionResponse`
  - Ask the user if any questions arise before proceeding to UI work

- [x] 7. Build the `ScoreWidget` component and integrate into `Nav.tsx`
  - [x] 7.1 Create `components/ScoreWidget.tsx`
    - Create a `"use client"` component accepting `ScoreWidgetProps: { buyerId?: string; mode?: "nav" | "inline"; estimatedCredits?: number; awardedCredits?: number }`
    - On mount, fetch `GET /api/green-credit/${buyerId ?? "b001"}` and set local state `{ gcs, badgeTier }`
    - Set up `setInterval` at 5 000 ms to re-fetch and update state; clear interval on unmount
    - Derive badge icon from tier: `🌱` Seedling, `🌿` Sprout, `🏆` EcoChampion, `🛡️` Guardian
    - In `"nav"` mode render a compact pill: `{icon} {gcs} pts · {badgeTier}` wrapped in a `<Link href="/profile/green-score">` — pill styles: `background: #18181b`, `border: 1px solid #27272a`, `color: #10b981`, `fontFamily: Figtree`
    - In `"inline"` mode render a larger card with score, tier badge, and (if provided) `estimatedCredits` or `awardedCredits` callout
    - On fetch failure, display last known score at reduced opacity (0.5); do not crash or throw
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 7.2 Integrate `ScoreWidget` into `Nav.tsx`
    - Replace the existing `"AI Live"` pill `<div>` in `Nav.tsx` with `<ScoreWidget mode="nav" />`
    - Keep surrounding `flex items-center gap-2` wrapper; remove the old `pulse-dot` div
    - The widget must render on every page because `Nav` is in the root layout
    - _Requirements: 5.1, 5.3_

- [x] 8. Build `ReturnNudgeBanner` and inject it into the return flow
  - [x] 8.1 Create `components/ReturnNudgeBanner.tsx`
    - Create a `"use client"` component accepting `ReturnNudgeBannerProps: { reason: string; deductionAmount?: number }`
    - Return `null` if `isDiscretionaryReturn(reason)` is `false` (import from `@/lib/green-credit-engine`)
    - When rendered, show an amber non-blocking banner matching `PreventionBanner.tsx` styling: amber border, `background: rgba(245,158,11,0.06)`, message `"⚠️ Heads up: confirming this return will deduct ${deductionAmount ?? 10} green credits from your score."`
    - No confirm/cancel buttons — the banner is informational only; the return flow is not blocked
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 8.2 Inject `ReturnNudgeBanner` into `app/return/page.tsx`
    - Import `ReturnNudgeBanner` into `app/return/page.tsx`
    - In the `upload` step JSX, render `{reason && <ReturnNudgeBanner reason={reason} />}` above the OTP fraud-check panel
    - The `reason` state variable is already set before `setStep("upload")` is called, so the banner has the correct value immediately on render
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 9. Build the GCS Profile Page (`app/profile/green-score/page.tsx`)
  - [x] 9.1 Create the profile page component
    - Create `app/profile/green-score/page.tsx` as a `"use client"` component
    - On mount, fetch `GET /api/green-credit/b001` (demo buyer); show a skeleton loader while loading; show an error card with retry button on failure
    - **Hero card**: render a circular SVG progress ring using the formula from the design §UI Components §4; display GCS integer, badge tier label, and badge emoji icon
    - **Badge tier card**: show current tier name + description; compute "N credits to next milestone" and display progress bar
    - **Vouchers section**: render a grid of voucher cards showing `code`, `discountPct%`, `expiresAt` formatted as `DD MMM YYYY`, and a status badge (`active` in green / `expired` in zinc)
    - **Action log**: render a scrollable list; each row shows `description`, signed `delta` (green for positive, red for negative), and `timestamp` formatted as relative time or `DD MMM YYYY HH:mm UTC`
    - **Empty state**: when `actionLog.length === 0`, show GCS=0 with Seedling badge and a call-to-action card prompting the first eco-friendly action
    - All styling matches the existing app palette (`#0c0c0e` background, `#10b981` accent, `Syne` + `Figtree` fonts)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 10. Update `app/dashboard/page.tsx` with GCS aggregate KPIs
  - [x] 10.1 Extend `DashboardStats` interface and KPI strip
    - Add `gcs_total_vouchers_issued: number`, `gcs_monthly_credits_earned: number`, `gcs_tier_counts: Record<string, number>` to the `DashboardStats` interface
    - Add three new KPI entries to the `KPIS` array: `gcs_total_vouchers_issued` (icon 🎟️, label "Vouchers Issued"), `gcs_monthly_credits_earned` (icon 🌿, label "Credits This Month"), and a `green_credits_awarded` update if needed
    - Add a new "Badge Tier Breakdown" card section below the existing KPI strip: render four mini-cards (one per tier) showing tier emoji, name, and buyer count from `gcs_tier_counts`
    - The badge tier breakdown card uses the same `#111113` card style as all other dashboard cards
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 11. Checkpoint — Full integration smoke test
  - Ensure `npm run test:run` passes all tests
  - Verify Nav bar shows `ScoreWidget` with seeded GCS for b001
  - Verify the return flow shows `ReturnNudgeBanner` when `changed_mind` or `wrong_variant` is selected
  - Verify `/profile/green-score` renders hero ring, badge tier card, vouchers, and action log
  - Verify `/dashboard` shows the three new GCS KPI cards and badge tier breakdown
  - Ask the user if any questions arise

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirement IDs for traceability
- Property tests use `fast-check` with `numRuns: 200` (Property 4 uses `numRuns: 1000`)
- All GCS state is in-memory and resets on serverless cold start — this is intentional (matches `listingFlags` pattern)
- The `ScoreWidget` polls every 5 000 ms; optimistic updates are optional and not required for MVP
- Seed calls in `lib/static-data.ts` execute at module load time — no explicit init call needed in routes
- `jest.config.ts` must map `@/` to `<rootDir>/` for tests to resolve imports correctly

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3"] },
    { "id": 3, "tasks": ["2.4", "2.5", "3.1"] },
    { "id": 4, "tasks": ["4.1", "4.2", "5.1", "5.2"] },
    { "id": 5, "tasks": ["4.3", "7.1", "8.1"] },
    { "id": 6, "tasks": ["7.2", "8.2", "9.1", "10.1"] }
  ]
}
```
