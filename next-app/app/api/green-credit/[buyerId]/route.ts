import { NextRequest, NextResponse } from "next/server";
import { getBuyerGCS } from "@/lib/green-credit-engine";
import { BUYERS } from "@/lib/data";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ buyerId: string }> }
) {
  try {
    const { buyerId } = await params;

    // Validate buyerId exists in BUYERS array
    const buyerExists = BUYERS.some((buyer) => buyer.id === buyerId);
    if (!buyerExists) {
      return NextResponse.json(
        { error: "Buyer not found", buyerId },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Call getBuyerGCS to get the GCS response
    const gcsResponse = getBuyerGCS(buyerId);

    // Return the response as JSON with Content-Type header
    return NextResponse.json(gcsResponse, {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
