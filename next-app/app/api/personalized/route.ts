import { NextRequest, NextResponse } from "next/server";
import { getBuyers, getMarketplaceListings } from "@/lib/data";
import { personalizeForBuyer } from "@/lib/buyer-match";
import { applyDynamicPricing } from "@/lib/dynamic-pricing";

// GET /api/personalized?buyerId=b001
// Returns ALL marketplace listings scored + sorted for the given buyer.
// Nothing is hidden — listings are re-ordered and annotated with a match %.
export async function GET(req: NextRequest) {
  const buyerId = req.nextUrl.searchParams.get("buyerId");

  const buyers = getBuyers();
  // Apply live demand-based pricing first, so personalized cards show it too.
  const listings = applyDynamicPricing(getMarketplaceListings(), buyers);

  if (!buyerId) {
    // No buyer selected → return listings unchanged (generic view).
    return NextResponse.json({ buyer: null, listings });
  }

  const buyer = buyers.find((b) => b.id === buyerId);
  if (!buyer) return NextResponse.json({ error: "Buyer not found" }, { status: 404 });

  const personalized = personalizeForBuyer(buyer, listings);
  return NextResponse.json({ buyer, listings: personalized });
}
