import { NextResponse } from "next/server";
import { getListingFlags } from "@/lib/data";

// Seeded aggregate stats (mix of demo real + synthetic)
const SEEDED = {
  total_processed: 47,
  returns_prevented: 12,
  disposition_split: { resell: 28, refurbish: 9, donate: 6, recycle: 4, exchange: 0 },
  value_recovered_inr: 184000,
  green_credits_awarded: 2350,
  // Sustainability KPIs
  co2_saved_kg: 142.6,          // resell×14.2 + refurb×8.5 + donate×5.8 + recycle×3.1
  ewaste_diverted_kg: 38.5,
  products_given_second_life: 43, // resell + refurbish + donate
  landfill_avoided_kg: 61.2,
  refurb_success_rate: 0.87,
  avg_circularity_score: 74,
  top_categories: [
    { category: "electronics", items: 18 },
    { category: "apparel", items: 14 },
    { category: "home_appliances", items: 9 },
    { category: "home", items: 4 },
    { category: "accessories", items: 2 },
  ],
  monthly_trend: [
    { month: "Jan", prevented: 3, processed: 9,  co2_saved: 18 },
    { month: "Feb", prevented: 5, processed: 11, co2_saved: 28 },
    { month: "Mar", prevented: 7, processed: 14, co2_saved: 38 },
    { month: "Apr", prevented: 9, processed: 16, co2_saved: 52 },
    { month: "May", prevented: 11, processed: 18,co2_saved: 64 },
    { month: "Jun", prevented: 12, processed: 21,co2_saved: 78 },
  ],
};

export async function GET() {
  const flags = getListingFlags();
  const flaggedListings = Object.entries(flags)
    .filter(([, count]) => count >= 2)
    .map(([product_id, count]) => ({ product_id, flag_count: count }));

  return NextResponse.json({ ...SEEDED, flagged_listings: flaggedListings });
}
