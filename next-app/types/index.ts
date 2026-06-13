export interface Product {
  id: string;
  name: string;
  category: string;
  mrp: number;
  avg_return_rate: number;
  top_return_reason: string;
  image: string;
}

export interface GradeResult {
  grade: "A" | "A-" | "B+" | "B" | "C";
  functional_risk: "none" | "low" | "medium" | "high";
  defects: string[];
  packaging_status: string;
  accessories_complete: boolean;
  confidence: number;
}

export interface EVTable {
  resell: number;
  refurbish: number;
  donate: number;
  recycle: number;
  exchange: number;
}

export interface ScoreBreakdown {
  economic: number;    // 0–1 normalized EV contribution
  sustainability: number; // 0–1
  trust: number;       // 0–1
  final: number;       // weighted composite 0–1
}

export interface DispositionResult {
  decision: "resell" | "refurbish" | "donate" | "recycle" | "exchange";
  ev_table: EVTable;
  score_breakdown: Record<string, ScoreBreakdown>;
  estimated_recovery: number;
  circularity_score: number;  // 0–100
  co2_saved_kg: number;
  reasoning_text: string;
  green_credits: number;
  listing_flagged?: boolean;
}

export interface PreventionScore {
  risk: number;
  top_driver: string;
  recommended_intervention: "show_banner_with_variant_suggestion" | "soft_nudge" | "none";
}

export interface Buyer {
  id: string;
  name: string;
  price_band: "budget" | "mid" | "premium";
  category_affinity: string[];
  eco_preference: number;
  grade_tolerance: string[];
  previous_refurb_purchases: number;
  location: string;
}

export interface MarketplaceListing {
  id: string;
  product_id: string;
  product_name: string;
  category: string;
  mrp: number;
  asking_price: number;
  grade: GradeResult;
  decision: string;
  listed_at: string;
  image: string;
  circularity_score: number;
  co2_saved_kg: number;
  expected_lifespan_years: number;
  warranty_months: number;
}

// GCS (Green Credit System) Types
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
  id: string;
  actionType: EcoActionType;
  delta: number;
  timestamp: string;
  entityId: string;
  description: string;
}

export interface GreenVoucher {
  id: string;
  code: string;
  milestoneGCS: number;
  discountPct: number;
  issuedAt: string;
  expiresAt: string;
  status: "active" | "expired";
}

export interface BuyerGCSRecord {
  buyerId: string;
  actionLog: EcoAction[];
  vouchers: GreenVoucher[];
  processedEventIds: Set<string>;
  milestonesReached: Set<number>;
}

export interface GCSResponse {
  buyerId: string;
  gcs: number;
  badgeTier: BadgeTier;
  actionLog: EcoAction[];
  vouchers: GreenVoucher[];
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
  eventId: string;
  metadata?: {
    disposition?: DispositionResult["decision"];
    circularityScore?: number;
    returnReason?: string;
    deliveryTimestamp?: string;
  };
}

export interface PostActionResponse {
  success: boolean;
  delta: number;
  newGCS: number;
  newBadgeTier: BadgeTier;
  vouchersGenerated: GreenVoucher[];
}
