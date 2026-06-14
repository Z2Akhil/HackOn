import { NextRequest, NextResponse } from "next/server";
import { getBuyers, getMarketplaceListings } from "@/lib/data";
import { matchScore, buildReason } from "@/lib/buyer-match";

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
