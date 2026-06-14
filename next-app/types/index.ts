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

// ============================================================================
// DONATION MATCHING TYPES
// ============================================================================

export interface GeoLocation {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export interface Charity {
  id: string;
  name: string;
  description: string;
  category: "education" | "health" | "livelihood" | "disability" | "disaster_relief" | "environment";
  location: GeoLocation;
  impact_areas: string[];
  lives_impacted: number;
  items_received: number;
  accepted_categories: string[];
  contact_person: string;
  phone: string;
  email: string;
  logo: string;
  verified: boolean;
}

export interface DonationRecord {
  id: string;
  donor_id: string;
  charity_id: string;
  product_id: string;
  product_name: string;
  category: string;
  mrp: number;
  grade: GradeResult;
  donated_at: string;
  delivery_status: "pending" | "in_transit" | "delivered" | "received";
  distance_km: number;
  lives_impacted_estimate: number;
}

export interface DonationImpact {
  total_items_donated: number;
  total_value_donated_inr: number;
  lives_impacted: number;
  categories: Record<string, number>;
  charities_supported: string[];
}
