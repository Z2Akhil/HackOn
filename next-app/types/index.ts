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
