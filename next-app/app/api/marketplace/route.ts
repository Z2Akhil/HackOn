import { NextResponse } from "next/server";
import { getMarketplaceListings, getBuyers } from "@/lib/data";
import { applyDynamicPricing } from "@/lib/dynamic-pricing";

export async function GET() {
  const listings = getMarketplaceListings();
  const buyers = getBuyers();
  // Annotate each listing with live, demand-based pricing.
  const priced = applyDynamicPricing(listings, buyers);
  return NextResponse.json(priced);
}
