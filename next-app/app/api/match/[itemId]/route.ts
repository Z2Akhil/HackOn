import { NextRequest, NextResponse } from "next/server";
import { getBuyers, getMarketplaceListings } from "@/lib/data";
import { matchScore, buildReason } from "@/lib/buyer-match";
import { MarketplaceListing, GradeResult } from "@/types";

const GRADE_ORDER = ["A", "A-", "B+", "B", "C"] as const;

function syntheticListing(itemId: string, q: URLSearchParams): MarketplaceListing {
  const grade = (q.get("grade") ?? "B+") as GradeResult["grade"];
  return {
    id: itemId,
    product_id: q.get("product_id") ?? itemId,
    product_name: q.get("name") ?? "User Listed Item",
    category: q.get("category") ?? "electronics",
    mrp: parseInt(q.get("mrp") ?? "5000"),
    asking_price: parseInt(q.get("asking_price") ?? "3000"),
    grade: {
      grade: GRADE_ORDER.includes(grade as typeof GRADE_ORDER[number]) ? grade : "B+",
      functional_risk: "low",
      defects: [],
      packaging_status: "missing_box",
      accessories_complete: true,
      confidence: 0.85,
    },
    decision: q.get("decision") ?? "resell",
    listed_at: new Date().toISOString(),
    image: "",
    circularity_score: parseInt(q.get("circularity_score") ?? "65"),
    co2_saved_kg: parseFloat(q.get("co2_saved_kg") ?? "5"),
    expected_lifespan_years: 3,
    warranty_months: 0,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;
  const q = req.nextUrl.searchParams;

  const listings = getMarketplaceListings();
  const listing = listings.find((l) => l.id === itemId) ?? syntheticListing(itemId, q);

  const buyers = getBuyers();
  const scored = buyers
    .map((b) => ({ buyer: b, score: matchScore(b, listing), reason: buildReason(b, listing) }))
    .filter((x) => x.score > 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return NextResponse.json({ listing, matches: scored });
}
