import { NextRequest, NextResponse } from "next/server";
import { CHARITIES, findNearbyCharities } from "@/lib/charities";

/**
 * GET /api/charities
 * - With query params: ?lat={latitude}&lon={longitude}&maxDistance={km}&count={n}
 *   Returns nearby charities sorted by distance
 * - Without query params: Returns all charities
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");
    const maxDistance = searchParams.get("maxDistance");
    const count = searchParams.get("count");

    // If location params provided, return nearby charities
    if (lat && lon) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);
      const max = maxDistance ? parseInt(maxDistance) : 50;
      const num = count ? parseInt(count) : 5;

      if (isNaN(latitude) || isNaN(longitude)) {
        return NextResponse.json(
          { error: "Invalid latitude or longitude" },
          { status: 400 }
        );
      }

      const nearby = findNearbyCharities(latitude, longitude, max, num);
      return NextResponse.json({
        charities: nearby,
        count: nearby.length,
      });
    }

    // Return all charities
    return NextResponse.json({
      charities: CHARITIES,
      count: CHARITIES.length,
    });
  } catch (error) {
    console.error("Error fetching charities:", error);
    return NextResponse.json(
      { error: "Failed to fetch charities" },
      { status: 500 }
    );
  }
}
