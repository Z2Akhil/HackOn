// Demand-based dynamic resale pricing.
// Reuses the buyer-match engine as a live "demand sensor": the more buyers
// strongly match a listing, the higher we can price it. Stale listings with
// little interest get marked down to move inventory. Pure deterministic math.

import { Buyer, MarketplaceListing } from "@/types";
import { matchScore } from "./buyer-match";

// A buyer "demands" a listing when their raw match score clears this bar
// (≈ category + grade + price fit all aligning).
const DEMAND_MATCH_THRESHOLD = 60;

// Price multiplier bounds — never run away from the base resale price.
const MIN_MULT = 0.7;
const MAX_MULT = 1.2;

const DAY_MS = 1000 * 60 * 60 * 24;

export interface DynamicPriceResult {
  base_price: number;
  dynamic_price: number;
  demand_count: number;
  demand_level: "high" | "medium" | "low";
  price_trend: "up" | "down" | "stable";
  pricing_reason: string;
}

export function computeDynamicPrice(
  listing: MarketplaceListing,
  buyers: Buyer[]
): DynamicPriceResult {
  const base_price = listing.asking_price;

  // 1. Measure demand: how many buyers strongly match this item.
  const demand_count = buyers.filter((b) => matchScore(b, listing) >= DEMAND_MATCH_THRESHOLD).length;
  const demand_level: DynamicPriceResult["demand_level"] =
    demand_count >= 4 ? "high" : demand_count >= 2 ? "medium" : "low";

  // 2. Measure staleness: how long it's been listed.
  const age_days = Math.max(0, (Date.now() - new Date(listing.listed_at).getTime()) / DAY_MS);

  // 3. Build the price multiplier.
  let mult = 1.0;
  if (demand_level === "high") mult += 0.12;
  else if (demand_level === "medium") mult += 0.04;
  else mult -= 0.06; // low demand → soften price

  // Stale + not-hot inventory gets an additional markdown to clear it.
  if (demand_level !== "high") {
    if (age_days > 7) mult -= 0.12;
    else if (age_days > 3) mult -= 0.06;
  }

  mult = Math.min(MAX_MULT, Math.max(MIN_MULT, mult));

  // 4. Apply, then clamp to a believable band (never above ~95% of MRP).
  let dynamic_price = Math.round(base_price * mult);
  dynamic_price = Math.min(dynamic_price, Math.round(listing.mrp * 0.95));
  dynamic_price = Math.max(dynamic_price, Math.round(base_price * 0.6));

  const delta_pct = Math.round(((dynamic_price - base_price) / base_price) * 100);
  const price_trend: DynamicPriceResult["price_trend"] =
    delta_pct > 1 ? "up" : delta_pct < -1 ? "down" : "stable";

  // 5. Explain it.
  let pricing_reason: string;
  if (price_trend === "up") {
    pricing_reason = `🔥 ${demand_count} buyers matched — high demand, price up ${delta_pct}%`;
  } else if (price_trend === "down") {
    const days = Math.round(age_days);
    pricing_reason =
      demand_level === "low"
        ? `↓ Low interest${days > 0 ? ` · ${days}d listed` : ""} — price dropped ${Math.abs(delta_pct)}%`
        : `↓ Listed ${days}d — price dropped ${Math.abs(delta_pct)}% to move it`;
  } else {
    pricing_reason = `Stable price · ${demand_count} buyer${demand_count === 1 ? "" : "s"} watching`;
  }

  return { base_price, dynamic_price, demand_count, demand_level, price_trend, pricing_reason };
}

/** Annotate a set of listings with live demand-based pricing. */
export function applyDynamicPricing(
  listings: MarketplaceListing[],
  buyers: Buyer[]
): MarketplaceListing[] {
  return listings.map((listing) => {
    const dp = computeDynamicPrice(listing, buyers);
    return {
      ...listing,
      base_price: dp.base_price,
      dynamic_price: dp.dynamic_price,
      demand_count: dp.demand_count,
      demand_level: dp.demand_level,
      price_trend: dp.price_trend,
      pricing_reason: dp.pricing_reason,
    };
  });
}
