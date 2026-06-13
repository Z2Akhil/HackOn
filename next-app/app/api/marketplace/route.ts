import { NextResponse } from "next/server";
import { getMarketplaceListings } from "@/lib/data";

export async function GET() {
  const listings = getMarketplaceListings();
  return NextResponse.json(listings);
}
