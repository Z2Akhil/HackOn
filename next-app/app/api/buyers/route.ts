import { NextResponse } from "next/server";
import { getBuyers } from "@/lib/data";

// Lightweight list of buyer personas — powers the "Viewing as" switcher
// on the personalized marketplace.
export async function GET() {
  const buyers = getBuyers();
  return NextResponse.json(buyers);
}
