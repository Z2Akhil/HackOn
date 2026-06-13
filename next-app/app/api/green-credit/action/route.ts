import { NextRequest, NextResponse } from "next/server";
import { recordAction } from "@/lib/green-credit-engine";
import { PostActionRequest, EcoActionType, PostActionResponse } from "@/types";
import { BUYERS } from "@/lib/data";

// Valid action types
const VALID_ACTION_TYPES: EcoActionType[] = [
  "return_refurbish",
  "return_resell",
  "return_donate",
  "return_recycle",
  "return_exchange",
  "marketplace_purchase",
  "shipping_consolidated",
  "shipping_carbon_offset",
  "deduction_discretionary_return",
];

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { buyerId, actionType, entityId, eventId, metadata } = body;

    // Validate required fields
    if (!buyerId) {
      return NextResponse.json(
        { error: "buyerId is required" },
        { status: 400 }
      );
    }

    if (!actionType) {
      return NextResponse.json(
        { error: "actionType is required" },
        { status: 400 }
      );
    }

    if (!entityId) {
      return NextResponse.json(
        { error: "entityId is required" },
        { status: 400 }
      );
    }

    if (!eventId) {
      return NextResponse.json(
        { error: "eventId is required for idempotency" },
        { status: 400 }
      );
    }

    // Validate actionType is valid EcoActionType
    if (!VALID_ACTION_TYPES.includes(actionType)) {
      return NextResponse.json(
        {
          error: "Invalid actionType",
          received: actionType,
          valid: VALID_ACTION_TYPES,
        },
        { status: 400 }
      );
    }

    // Validate buyerId exists in BUYERS
    const buyerExists = BUYERS.some((buyer) => buyer.id === buyerId);
    if (!buyerExists) {
      return NextResponse.json(
        { error: "Buyer not found", buyerId },
        { status: 404 }
      );
    }

    // Call recordAction
    const response = recordAction({
      buyerId,
      actionType,
      entityId,
      eventId,
      metadata,
    });

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
