// Shared buyer ↔ listing matching engine.
// Powers BOTH directions:
//   • Next-Best-Owner   (1 item  → best buyers)   — /api/match/[itemId]
//   • Personalized feed (1 buyer → best items)    — /api/personalized
//
// Single source of truth so both views always agree.

import { Buyer, MarketplaceListing } from "@/types";

// Max achievable raw points — used to normalize into a 0–100 "match %".
// category 40 + grade 30 + price 20 + eco 10 + history 9 + circularity 5 = 114
const MAX_RAW_SCORE = 114;

/**
 * Raw additive match score between a buyer and a listing.
 * Higher = better fit. Kept identical to the original /api/match logic
 * so existing behavior (PassportModal "pts") is unchanged.
 */
export function matchScore(buyer: Buyer, listing: MarketplaceListing): number {
  let score = 0;

  // Category affinity (highest weight — domain fit)
  if (buyer.category_affinity.includes(listing.category)) score += 40;

  // Grade tolerance (quality expectation fit)
  if (buyer.grade_tolerance.includes(listing.grade.grade)) score += 30;

  // Price fit — how well asking_price / mrp matches price sensitivity
  const ratio = listing.asking_price / listing.mrp;
  const priceScore =
    buyer.price_band === "budget"  && ratio < 0.55 ? 20 :
    buyer.price_band === "mid"     && ratio < 0.75 ? 15 :
    buyer.price_band === "premium"                 ? 10 : 5;
  score += priceScore;

  // Eco preference bonus (sustainability alignment)
  score += Math.round(buyer.eco_preference * 10);

  // Previous refurb/open-box purchase history (trust signal)
  score += Math.min(buyer.previous_refurb_purchases * 3, 9);

  // Circularity affinity — eco buyers value high circularity items more
  if (buyer.eco_preference > 0.7 && listing.circularity_score > 70) score += 5;

  return Math.round(score);
}

/** Normalize raw points → 0–100 match percentage for UI display. */
export function matchPercent(rawScore: number): number {
  return Math.min(100, Math.round((rawScore / MAX_RAW_SCORE) * 100));
}

/**
 * Predicted conversion probability (0–1) via a logistic curve on the match %.
 * Turns a "score" into an actionable "X% likely to buy".
 */
export function predictedConversion(rawScore: number): number {
  const pct = rawScore / MAX_RAW_SCORE; // 0–1
  const p = 1 / (1 + Math.exp(-8 * (pct - 0.5)));
  return parseFloat(p.toFixed(2));
}

/** Human-readable explanation of why a buyer fits a listing. */
export function buildReason(buyer: Buyer, listing: MarketplaceListing): string {
  const parts: string[] = [];
  if (buyer.category_affinity.includes(listing.category)) parts.push(`shops ${listing.category.replace(/_/g, " ")}`);
  if (buyer.grade_tolerance.includes(listing.grade.grade)) parts.push(`accepts ${listing.grade.grade} grade`);
  if (buyer.price_band === "budget") parts.push("budget-conscious");
  if (buyer.eco_preference > 0.7) parts.push("eco-conscious");
  if (buyer.previous_refurb_purchases > 0) parts.push(`${buyer.previous_refurb_purchases} prior open-box purchases`);
  if (listing.circularity_score > 75) parts.push(`high circularity item (${listing.circularity_score}/100)`);
  return parts.join(", ");
}

/**
 * Reason phrased FROM the buyer's point of view (for the personalized feed).
 * e.g. "Matches your electronics interest · great value for your budget"
 */
export function buildBuyerFacingReason(buyer: Buyer, listing: MarketplaceListing): string {
  const parts: string[] = [];
  if (buyer.category_affinity.includes(listing.category)) parts.push(`matches your ${listing.category.replace(/_/g, " ")} interest`);
  if (buyer.grade_tolerance.includes(listing.grade.grade)) parts.push(`condition you accept (${listing.grade.grade})`);

  const ratio = listing.asking_price / listing.mrp;
  const discount = Math.round((1 - ratio) * 100);
  if (buyer.price_band === "budget" && ratio < 0.55) parts.push(`great value (${discount}% off)`);
  else if (buyer.price_band === "mid" && ratio < 0.75) parts.push(`good deal (${discount}% off)`);

  if (buyer.eco_preference > 0.7 && listing.circularity_score > 70) parts.push(`high circularity (${listing.circularity_score}/100)`);

  if (parts.length === 0) parts.push("worth a look");
  return parts.slice(0, 3).join(" · ");
}

export interface PersonalizedListing extends MarketplaceListing {
  match_score: number;      // raw points
  match_percent: number;    // 0–100
  conversion: number;       // 0–1 predicted purchase probability
  match_reason: string;     // buyer-facing explanation
}

/**
 * Score every listing for a single buyer and return them sorted best-first.
 * Nothing is hidden — only re-ordered + annotated (avoids an empty-looking grid).
 */
export function personalizeForBuyer(
  buyer: Buyer,
  listings: MarketplaceListing[]
): PersonalizedListing[] {
  return listings
    .map((listing) => {
      const raw = matchScore(buyer, listing);
      return {
        ...listing,
        match_score: raw,
        match_percent: matchPercent(raw),
        conversion: predictedConversion(raw),
        match_reason: buildBuyerFacingReason(buyer, listing),
      };
    })
    .sort((a, b) => b.match_score - a.match_score);
}
