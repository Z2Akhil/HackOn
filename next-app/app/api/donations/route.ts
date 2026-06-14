import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { recordDonation, getBuyerDonations, getCharityById, estimateLivesImpacted, getDonationImpact } from "@/lib/charities";
import { DonationRecord } from "@/types";

/**
 * POST /api/donations
 * Records a new donation from a return
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      donor_id,
      charity_id,
      product_id,
      product_name,
      category,
      mrp,
      grade,
    } = body;

    // Validate required fields
    if (!donor_id || !charity_id || !product_id || !product_name || !category || !mrp) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate grade has at least grade string
    if (!grade || !grade.grade) {
      return NextResponse.json(
        { error: "Grade information required" },
        { status: 400 }
      );
    }

    // QUALITY CONTROL: Enforce minimum grade B+ for donations
    const acceptableGrades = ["A", "A-", "B+"];
    if (!acceptableGrades.includes(grade.grade)) {
      return NextResponse.json(
        { 
          error: "Item quality too low for donation",
          details: `Minimum grade B+ required for donations. Your item is graded ${grade.grade}. Consider reselling or recycling instead.`,
          acceptable_grades: acceptableGrades,
          your_grade: grade.grade
        },
        { status: 400 }
      );
    }

    // QUALITY CONTROL: Flag high-risk items
    if (grade.functional_risk === "high" || grade.functional_risk === "medium") {
      return NextResponse.json(
        { 
          error: "Item has functional issues",
          details: `Items with ${grade.functional_risk} functional risk cannot be donated. Consider recycling instead.`,
          functional_risk: grade.functional_risk
        },
        { status: 400 }
      );
    }

    // Verify charity exists
    const charity = getCharityById(charity_id);
    if (!charity) {
      return NextResponse.json(
        { error: "Charity not found", charity_id },
        { status: 404 }
      );
    }

    // Verify charity accepts this category
    if (!charity.accepted_categories.includes(category)) {
      return NextResponse.json(
        { error: "Charity does not accept this product category", category, accepted: charity.accepted_categories },
        { status: 400 }
      );
    }

    // Estimate lives impacted
    const livesImpacted = estimateLivesImpacted(category, grade.grade || "A-");

    // Calculate green credits for donation
    // Base: 30 credits for donation (less than resale's 50, but more than recycling's 10)
    // Bonus for grade: A=+10, A-=+5, B+=0
    let greenCredits = 30;
    if (grade.grade === "A") greenCredits += 10;
    else if (grade.grade === "A-") greenCredits += 5;

    // Create donation record
    const gradeRecord = grade.grade ? {
      grade: grade.grade,
      functional_risk: grade.functional_risk || "low",
      defects: grade.defects || [],
      packaging_status: grade.packaging_status || "unknown",
      accessories_complete: grade.accessories_complete !== false,
      confidence: grade.confidence || 1.0,
    } : grade;

    const donation: DonationRecord = {
      id: `donation-${randomUUID()}`,
      donor_id,
      charity_id,
      product_id,
      product_name,
      category,
      mrp,
      grade: gradeRecord as any,
      donated_at: new Date().toISOString(),
      delivery_status: "pending",
      distance_km: 0, // Will be calculated on frontend
      lives_impacted_estimate: livesImpacted,
    };

    recordDonation(donation);

    return NextResponse.json({
      success: true,
      donation_id: donation.id,
      lives_impacted: livesImpacted,
      green_credits: greenCredits,
      message: `Donation recorded! Your item will impact approximately ${livesImpacted} lives. +${greenCredits} green credits earned.`,
    });
  } catch (error) {
    console.error("Error recording donation:", error);
    return NextResponse.json(
      { error: "Failed to record donation", details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/donations?buyerId={buyerId}
 * Get all donations for a buyer
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const buyerId = searchParams.get("buyerId");

    if (!buyerId) {
      return NextResponse.json(
        { error: "buyerId is required" },
        { status: 400 }
      );
    }

    const donations = getBuyerDonations(buyerId);
    const impact = getDonationImpact(buyerId);

    return NextResponse.json({
      donations,
      impact,
      count: donations.length,
    });
  } catch (error) {
    console.error("Error fetching donations:", error);
    return NextResponse.json(
      { error: "Failed to fetch donations" },
      { status: 500 }
    );
  }
}
