import { NextRequest, NextResponse } from "next/server";
import { getCharityById } from "@/lib/charities";

/**
 * GET /api/charities/[charityId]
 * Returns details for a specific charity
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ charityId: string }> }
) {
  try {
    const { charityId } = await params;

    const charity = getCharityById(charityId);

    if (!charity) {
      return NextResponse.json(
        { error: "Charity not found", charityId },
        { status: 404 }
      );
    }

    return NextResponse.json(charity);
  } catch (error) {
    console.error("Error fetching charity:", error);
    return NextResponse.json(
      { error: "Failed to fetch charity" },
      { status: 500 }
    );
  }
}
