import { NextResponse } from "next/server";
import { getProducts } from "@/lib/data";

export async function GET() {
  return NextResponse.json(getProducts());
}
