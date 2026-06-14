// Standalone inspection of demand-based dynamic pricing.
// Run with:  npx tsx scripts/inspect-pricing.ts   (from the next-app folder)
//
// Prints a table of every marketplace listing showing base price vs the live
// demand-adjusted price, the trend (up / down / stable), and the reason.

import { MARKETPLACE_LISTINGS, BUYERS } from "../lib/static-data";
import { computeDynamicPrice } from "../lib/dynamic-pricing";

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
const arrow = (t: string) => (t === "up" ? "▲ up" : t === "down" ? "▼ down" : "▬ stable");

const rows = MARKETPLACE_LISTINGS.map((listing) => {
  const dp = computeDynamicPrice(listing, BUYERS);
  const deltaPct = Math.round(((dp.dynamic_price - dp.base_price) / dp.base_price) * 100);
  return {
    Item: listing.product_name,
    Grade: listing.grade.grade,
    Base: inr(dp.base_price),
    Dynamic: inr(dp.dynamic_price),
    "Δ%": (deltaPct > 0 ? "+" : "") + deltaPct + "%",
    Trend: arrow(dp.price_trend),
    Demand: `${dp.demand_count} (${dp.demand_level})`,
  };
});

console.log("\nDemand-based dynamic pricing — base vs live price\n");
console.table(rows);

const up = rows.filter((r) => r.Trend.includes("up")).length;
const down = rows.filter((r) => r.Trend.includes("down")).length;
const stable = rows.filter((r) => r.Trend.includes("stable")).length;
console.log(`\nSummary: ${up} increased · ${down} decreased · ${stable} stable  (of ${rows.length} listings)\n`);

// Full reasons (console.table truncates long strings)
console.log("Reasons:");
MARKETPLACE_LISTINGS.forEach((listing) => {
  const dp = computeDynamicPrice(listing, BUYERS);
  console.log(`  • ${listing.product_name}: ${dp.pricing_reason}`);
});
console.log("");
