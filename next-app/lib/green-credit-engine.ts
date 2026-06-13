import { randomUUID } from "crypto";
import {
  BadgeTier,
  EcoActionType,
  EcoAction,
  GreenVoucher,
  BuyerGCSRecord,
  DispositionResult,
  PostActionRequest,
  PostActionResponse,
  GCSResponse,
  GCSAggregate,
} from "@/types";

// ============================================================================
// MODULE-LEVEL CONSTANTS
// ============================================================================

const CREDIT_TABLE: Record<EcoActionType, number> = {
  return_refurbish: 50,
  return_resell: 50,
  return_donate: 30,
  return_recycle: 20,
  return_exchange: 10,
  marketplace_purchase: 40,
  shipping_consolidated: 15,
  shipping_carbon_offset: 25,
  deduction_discretionary_return: -10,
};

const MILESTONES = [200, 500, 800, 1000] as const;

const MILESTONE_DISCOUNTS: Record<number, number> = {
  200: 5,
  500: 10,
  800: 15,
  1000: 20,
};

const BADGE_TIERS: [BadgeTier, number, number][] = [
  ["Seedling", 0, 199],
  ["Sprout", 200, 499],
  ["EcoChampion", 500, 799],
  ["Guardian", 800, 1000],
];

// ============================================================================
// PURE HELPER FUNCTIONS
// ============================================================================

/**
 * Computes green credits for a return action based on disposition.
 * - Base delta from CREDIT_TABLE for return_* types
 * - If circularityScore >= 70, add +10 bonus
 * - Example: disposition="refurbish", circularity=75 → 50 + 10 = 60
 *
 * @param disposition - The return disposition (refurbish, resell, donate, recycle, exchange)
 * @param circularityScore - Optional circularity score (0-100)
 * @returns The credit delta for this return
 */
export function computeReturnCredits(
  disposition: DispositionResult["decision"],
  circularityScore?: number
): number {
  const actionType = `return_${disposition}` as EcoActionType;
  const baseCredits = CREDIT_TABLE[actionType] ?? 0;
  const bonus =
    circularityScore !== undefined && circularityScore >= 70 ? 10 : 0;
  return baseCredits + bonus;
}

/**
 * Computes green credits for any eco-action type.
 * - Delegates to computeReturnCredits for return_* types
 * - Returns fixed deltas for marketplace_purchase, shipping_consolidated, shipping_carbon_offset
 * - Returns -10 for deduction_discretionary_return
 * - Uses metadata.circularityScore if provided
 *
 * @param actionType - The type of eco-action
 * @param metadata - Optional metadata including circularityScore for return actions
 * @returns The credit delta for this action
 */
export function computeActionCredits(
  actionType: EcoActionType,
  metadata?: PostActionRequest["metadata"]
): number {
  // Handle return types
  if (actionType.startsWith("return_")) {
    const disposition = actionType.replace("return_", "") as DispositionResult["decision"];
    return computeReturnCredits(disposition, metadata?.circularityScore);
  }

  // Handle other action types
  return CREDIT_TABLE[actionType] ?? 0;
}

/**
 * Computes the Green Credit Score (GCS) from a list of actions.
 * - Sum all action deltas
 * - Clamp result to [0, 1000]
 *
 * @param actions - Array of EcoActions
 * @returns The clamped GCS value [0, 1000]
 */
export function computeGCS(actions: EcoAction[]): number {
  const sum = actions.reduce((acc, action) => acc + action.delta, 0);
  return Math.max(0, Math.min(1000, sum));
}

/**
 * Assigns a badge tier based on GCS value.
 * - Maps GCS value to tier using BADGE_TIERS table
 * - 0-199 → Seedling, 200-499 → Sprout, 500-799 → EcoChampion, 800-1000 → Guardian
 *
 * @param gcs - The Green Credit Score value
 * @returns The corresponding badge tier
 */
export function assignBadgeTier(gcs: number): BadgeTier {
  for (const [tier, min, max] of BADGE_TIERS) {
    if (gcs >= min && gcs <= max) {
      return tier;
    }
  }
  // Default to Seedling (should never reach here if gcs is in [0, 1000])
  return "Seedling";
}

/**
 * Computes newly crossed milestones when GCS changes from oldGCS to newGCS.
 * - Find milestones in [200, 500, 800, 1000] crossed for the first time
 * - Returns array of newly-crossed milestone values
 * - Example: oldGCS=150, newGCS=620, milestonesReached={} → [200, 500]
 * - Example: oldGCS=150, newGCS=620, milestonesReached={200} → [500]
 *
 * @param oldGCS - Previous GCS value
 * @param newGCS - New GCS value
 * @param milestonesReached - Set of milestones already reached
 * @returns Array of newly-crossed milestone values
 */
export function computeNewMilestones(
  oldGCS: number,
  newGCS: number,
  milestonesReached: Set<number>
): number[] {
  const newMilestones: number[] = [];

  for (const milestone of MILESTONES) {
    // Check if milestone was crossed (oldGCS < milestone <= newGCS)
    if (oldGCS < milestone && newGCS >= milestone) {
      // Check if this is the first time crossing
      if (!milestonesReached.has(milestone)) {
        newMilestones.push(milestone);
      }
    }
  }

  return newMilestones;
}

/**
 * Generates a GreenVoucher for a given milestone.
 * - Generate UUID for id
 * - Generate code: `GCS${milestoneGCS}-${4-char-random}-${year}` (e.g., "GCS200-4F3A-2026")
 * - Get discount from MILESTONE_DISCOUNTS
 * - Set expiresAt to now + 90 days
 * - Set status to "active"
 *
 * @param milestoneGCS - The milestone GCS value (200, 500, 800, or 1000)
 * @param now - Current date for expiry calculation
 * @returns Generated GreenVoucher object
 */
export function generateVoucher(
  milestoneGCS: number,
  now: Date
): GreenVoucher {
  const id = randomUUID();

  // Generate code: GCS{milestone}-{4-char-random}-{year}
  const randomPart = Math.random()
    .toString(36)
    .substring(2, 6)
    .toUpperCase()
    .padEnd(4, "0");
  const year = now.getFullYear();
  const code = `GCS${milestoneGCS}-${randomPart}-${year}`;

  const discountPct = MILESTONE_DISCOUNTS[milestoneGCS] ?? 0;

  // Calculate expiry: now + 90 days
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 90);

  return {
    id,
    code,
    milestoneGCS,
    discountPct,
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: "active",
  };
}

/**
 * Returns the status of a voucher (active or expired).
 * - Compare voucher.expiresAt to now ?? new Date()
 * - Return "active" if now < expiresAt, "expired" if now >= expiresAt
 *
 * @param voucher - The GreenVoucher to check
 * @param now - Current date (defaults to new Date())
 * @returns "active" if voucher has not expired, "expired" otherwise
 */
export function getVoucherStatus(
  voucher: GreenVoucher,
  now?: Date
): "active" | "expired" {
  const currentTime = now ?? new Date();
  const expiryTime = new Date(voucher.expiresAt);

  if (currentTime >= expiryTime) {
    return "expired";
  }
  return "active";
}

/**
 * Determines if a return reason qualifies as discretionary (and thus deductible).
 * - Return true iff reason === "changed_mind" || reason === "wrong_variant"
 * - Return false for all other reasons
 *
 * @param reason - The return reason
 * @returns true if reason is discretionary, false otherwise
 */
export function isDiscretionaryReturn(reason: string): boolean {
  return reason === "changed_mind" || reason === "wrong_variant";
}

/**
 * Checks if an action is within 72 hours of a delivery timestamp.
 * - Parse both ISO-8601 timestamps
 * - Calculate difference in milliseconds
 * - Return true if difference <= 72 * 3600 * 1000 ms
 *
 * @param deliveryTimestamp - ISO-8601 timestamp of delivery
 * @param actionTimestamp - ISO-8601 timestamp of action
 * @returns true if action is within 72 hours of delivery, false otherwise
 */
export function isWithin72Hours(
  deliveryTimestamp: string,
  actionTimestamp: string
): boolean {
  const delivery = new Date(deliveryTimestamp);
  const action = new Date(actionTimestamp);

  const diffMs = action.getTime() - delivery.getTime();
  const hours72Ms = 72 * 3600 * 1000;

  return diffMs >= 0 && diffMs <= hours72Ms;
}

// ============================================================================
// IN-MEMORY STORE (Module-level)
// ============================================================================

const GCS_STORE = new Map<string, BuyerGCSRecord>();

/**
 * Initializes or gets a buyer's GCS record from the store.
 * Creates an empty record if the buyer doesn't exist yet.
 *
 * @param buyerId - The buyer's ID
 * @returns The BuyerGCSRecord for this buyer
 */
function getOrCreateBuyerRecord(buyerId: string): BuyerGCSRecord {
  if (!GCS_STORE.has(buyerId)) {
    GCS_STORE.set(buyerId, {
      buyerId,
      actionLog: [],
      vouchers: [],
      processedEventIds: new Set(),
      milestonesReached: new Set(),
    });
  }
  return GCS_STORE.get(buyerId)!;
}

/**
 * Records an eco-action for a buyer.
 * - Handles idempotency using processedEventIds
 * - Recomputes GCS
 * - Checks for milestone crossings and generates vouchers
 *
 * @param request - The PostActionRequest containing action details
 * @returns PostActionResponse with success status, delta, new GCS, tier, and generated vouchers
 */
export function recordAction(
  request: PostActionRequest
): PostActionResponse {
  const { buyerId, actionType, entityId, eventId, metadata } = request;

  const record = getOrCreateBuyerRecord(buyerId);
  const oldGCS = computeGCS(record.actionLog);

  // Check for duplicate event
  if (record.processedEventIds.has(eventId)) {
    return {
      success: true,
      delta: 0,
      newGCS: oldGCS,
      newBadgeTier: assignBadgeTier(oldGCS),
      vouchersGenerated: [],
    };
  }

  // Compute the credit delta
  let delta = computeActionCredits(actionType, metadata);

  // Handle discretionary return deduction rules
  if (actionType === "deduction_discretionary_return") {
    // This is already handled by CREDIT_TABLE, but we check the 72-hour window
    if (
      metadata?.deliveryTimestamp &&
      metadata?.returnReason &&
      isDiscretionaryReturn(metadata.returnReason) &&
      isWithin72Hours(metadata.deliveryTimestamp, new Date().toISOString())
    ) {
      delta = -10;
    }
  } else if (
    actionType.startsWith("return_") &&
    metadata?.returnReason &&
    isDiscretionaryReturn(metadata.returnReason) &&
    metadata?.deliveryTimestamp
  ) {
    // This is a discretionary return within the window, apply deduction instead
    if (isWithin72Hours(metadata.deliveryTimestamp, new Date().toISOString())) {
      delta = -10;
    }
  }

  // Create action log entry
  const action: EcoAction = {
    id: eventId,
    actionType,
    delta,
    timestamp: new Date().toISOString(),
    entityId,
    description: generateActionDescription(actionType, metadata),
  };

  // Add to action log and mark as processed
  record.actionLog.push(action);
  record.processedEventIds.add(eventId);

  // Compute new GCS
  const newGCS = computeGCS(record.actionLog);
  const newBadgeTier = assignBadgeTier(newGCS);

  // Check for new milestones
  const newMilestones = computeNewMilestones(
    oldGCS,
    newGCS,
    record.milestonesReached
  );

  const vouchersGenerated: GreenVoucher[] = [];
  const now = new Date();

  for (const milestone of newMilestones) {
    const voucher = generateVoucher(milestone, now);
    record.vouchers.push(voucher);
    record.milestonesReached.add(milestone);
    vouchersGenerated.push(voucher);
  }

  return {
    success: true,
    delta,
    newGCS,
    newBadgeTier,
    vouchersGenerated,
  };
}

/**
 * Gets the full GCS record for a buyer.
 * - Returns live-status vouchers (expiry checked at call time)
 * - Sorts action log in reverse-chronological order
 *
 * @param buyerId - The buyer's ID
 * @returns GCSResponse with current score, tier, and history
 */
export function getBuyerGCS(buyerId: string): GCSResponse {
  const record = getOrCreateBuyerRecord(buyerId);
  const gcs = computeGCS(record.actionLog);
  const badgeTier = assignBadgeTier(gcs);

  // Sort action log in reverse-chronological order (most recent first)
  const sortedActionLog = [...record.actionLog].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Update voucher statuses (check expiry at read time)
  const vouchersWithLiveStatus = record.vouchers.map((v) => ({
    ...v,
    status: getVoucherStatus(v),
  }));

  return {
    buyerId,
    gcs,
    badgeTier,
    actionLog: sortedActionLog,
    vouchers: vouchersWithLiveStatus,
  };
}

/**
 * Gets aggregate GCS statistics for the dashboard.
 *
 * @returns GCSAggregate with total vouchers, monthly credits, and tier counts
 */
export function getGCSAggregate(): GCSAggregate {
  const tierCounts: Record<BadgeTier, number> = {
    Seedling: 0,
    Sprout: 0,
    EcoChampion: 0,
    Guardian: 0,
  };

  let totalVouchersIssued = 0;
  let monthlyCreditsEarned = 0;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  for (const record of GCS_STORE.values()) {
    const gcs = computeGCS(record.actionLog);
    const tier = assignBadgeTier(gcs);
    tierCounts[tier]++;

    // Count vouchers
    totalVouchersIssued += record.vouchers.length;

    // Count credits earned this month
    for (const action of record.actionLog) {
      const actionTime = new Date(action.timestamp);
      if (actionTime >= monthStart && action.delta > 0) {
        monthlyCreditsEarned += action.delta;
      }
    }
  }

  return {
    totalVouchersIssued,
    monthlyCreditsEarned,
    tierCounts,
  };
}

/**
 * Seeds a buyer record with pre-built actions (for demo purposes).
 *
 * @param buyerId - The buyer's ID
 * @param actions - Array of actions to seed (without IDs, which will be generated)
 */
export function seedBuyerGCS(
  buyerId: string,
  actions: Omit<EcoAction, "id">[]
): void {
  const record = getOrCreateBuyerRecord(buyerId);
  record.actionLog = actions.map((a, i) => ({
    ...a,
    id: `seeded-${buyerId}-${i}`,
  }));
  record.processedEventIds = new Set(
    record.actionLog.map((a) => a.id)
  );

  // Recompute milestones reached
  const gcs = computeGCS(record.actionLog);
  for (const milestone of MILESTONES) {
    if (gcs >= milestone) {
      record.milestonesReached.add(milestone);
    }
  }

  // Generate vouchers for reached milestones
  const now = new Date();
  for (const milestone of record.milestonesReached) {
    if (!record.vouchers.some((v) => v.milestoneGCS === milestone)) {
      record.vouchers.push(generateVoucher(milestone, now));
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generates a human-readable description for an action.
 *
 * @param actionType - The type of eco-action
 * @param metadata - Optional metadata
 * @returns A descriptive string
 */
function generateActionDescription(
  actionType: EcoActionType,
  metadata?: PostActionRequest["metadata"]
): string {
  switch (actionType) {
    case "return_refurbish":
      return "Return item refurbished";
    case "return_resell":
      return "Return item resold";
    case "return_donate":
      return "Return item donated";
    case "return_recycle":
      return "Return item recycled";
    case "return_exchange":
      return "Return item exchanged";
    case "marketplace_purchase":
      return "Purchased from marketplace";
    case "shipping_consolidated":
      return "Consolidated shipping selected";
    case "shipping_carbon_offset":
      return "Carbon offset shipping selected";
    case "deduction_discretionary_return":
      return `Discretionary return deduction (${metadata?.returnReason || "unknown reason"})`;
    default:
      return "Eco-friendly action";
  }
}
