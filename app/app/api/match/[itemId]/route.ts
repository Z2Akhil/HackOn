import { NextRequest, NextResponse } from "next/server";
import { getBuyers, getMarketplaceListings } from "@/lib/data";
import { Buyer, MarketplaceListing } from "@/types";

function matchScore(buyer: Buyer, listing: MarketplaceListing): number {
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;
  const listings = getMarketplaceListings();
  const listing = listings.find((l) => l.id === itemId);
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  const buyers = getBuyers();
  const scored = buyers
    .map((b) => ({ buyer: b, score: matchScore(b, listing), reason: buildReason(b, listing) }))
    .filter((x) => x.score > 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return NextResponse.json({ listing, matches: scored });
}

function buildReason(buyer: Buyer, listing: MarketplaceListing): string {
  const parts: string[] = [];
  if (buyer.category_affinity.includes(listing.category)) parts.push(`shops ${listing.category}`);
  if (buyer.grade_tolerance.includes(listing.grade.grade)) parts.push(`accepts ${listing.grade.grade} grade`);
  if (buyer.price_band === "budget") parts.push("budget-conscious");
  if (buyer.eco_preference > 0.7) parts.push("eco-conscious");
  if (buyer.previous_refurb_purchases > 0) parts.push(`${buyer.previous_refurb_purchases} prior open-box purchases`);
  if (listing.circularity_score > 75) parts.push(`high circularity item (${listing.circularity_score}/100)`);
  return parts.join(", ");
}
