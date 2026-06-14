"use client";

import { useEffect, useState } from "react";
import { Charity } from "@/types";

interface DonationMatcherProps {
  buyerId: string;
  productId: string;
  productName: string;
  productCategory: string;
  productMrp: number;
  grade: { grade: string };
  buyerLocation?: { latitude: number; longitude: number };
  onDonationSelected?: (charityId: string, charity: Charity) => void;
}

interface CharityWithDistance extends Charity {
  distance_km: number;
}

export default function DonationMatcher({
  buyerId,
  productId,
  productName,
  productCategory,
  productMrp,
  grade,
  buyerLocation,
  onDonationSelected,
}: DonationMatcherProps) {
  const [charities, setCharities] = useState<CharityWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedCharity, setSelectedCharity] = useState<string | null>(null);
  const [livesImpacted, setLivesImpacted] = useState(0);

  // Default buyer locations (mock)
  const DEFAULT_LOCATIONS: Record<string, { latitude: number; longitude: number }> = {
    b001: { latitude: 19.0760, longitude: 72.8777 }, // Mumbai
    b002: { latitude: 12.9716, longitude: 77.5946 }, // Bangalore
    b003: { latitude: 28.7041, longitude: 77.1025 }, // Delhi
  };

  useEffect(() => {
    const fetchCharities = async () => {
      try {
        setLoading(true);
        setError(false);

        const location = buyerLocation || DEFAULT_LOCATIONS[buyerId] || DEFAULT_LOCATIONS.b001;

        const response = await fetch(
          `/api/charities?lat=${location.latitude}&lon=${location.longitude}&maxDistance=100&count=5`
        );

        if (!response.ok) throw new Error("Failed to fetch charities");

        const data = await response.json();
        setCharities(data.charities);
      } catch (err) {
        console.error("Error fetching charities:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchCharities();
  }, [buyerId, buyerLocation]);

  const handleCharitySelect = async (charityId: string, charity: Charity) => {
    try {
      const response = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          donor_id: buyerId,
          charity_id: charityId,
          product_id: productId,
          product_name: productName,
          category: productCategory,
          mrp: productMrp,
          grade,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Donation API error:", errorData);
        throw new Error(errorData.error || "Failed to record donation");
      }

      const data = await response.json();
      setLivesImpacted(data.lives_impacted);
      setSelectedCharity(charityId);

      if (onDonationSelected) {
        onDonationSelected(charityId, charity);
      }
    } catch (err) {
      console.error("Error recording donation:", err);
      alert("Failed to record donation. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl p-6 animate-pulse" style={{ background: "#18181b", border: "1px solid #27272a" }}>
        <div className="h-6 w-48 rounded bg-gray-700 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded bg-gray-700" />
          ))}
        </div>
      </div>
    );
  }

  if (error || charities.length === 0) {
    return (
      <div
        className="rounded-xl p-6 text-center"
        style={{ background: "#111113", border: "1px solid #27272a" }}
      >
        <div className="text-3xl mb-3">❌</div>
        <h3 className="font-bold mb-2" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>
          No Charities Found
        </h3>
        <p style={{ color: "#a1a1aa", fontFamily: "Figtree, sans-serif" }}>
          We couldn't find nearby charities in your area. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold mb-1" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>
          💝 Nearby Charities (Ready to Receive)
        </h3>
        <p style={{ color: "#a1a1aa", fontFamily: "Figtree, sans-serif", fontSize: "0.875rem" }}>
          Your {productCategory} will be donated directly to a nearby organization.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {charities.map((charity) => (
          <div
            key={charity.id}
            onClick={() => handleCharitySelect(charity.id, charity)}
            className={`rounded-xl p-4 cursor-pointer transition-all hover:opacity-80 ${
              selectedCharity === charity.id
                ? "ring-2 ring-green-500"
                : "hover:border-green-500/50"
            }`}
            style={{
              background: "#111113",
              border: selectedCharity === charity.id ? "2px solid #10b981" : "1px solid #27272a",
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-2xl mb-1">{charity.logo}</div>
                <h4 className="font-bold text-sm" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>
                  {charity.name}
                </h4>
                <p className="text-xs mt-1" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>
                  📍 {charity.location.city} • {charity.distance_km} km away
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold" style={{ color: "#10b981" }}>
                  ✓
                </div>
              </div>
            </div>

            <p className="text-xs mb-2" style={{ color: "#a1a1aa", fontFamily: "Figtree, sans-serif" }}>
              {charity.description}
            </p>

            <div className="flex items-center justify-between text-xs">
              <span style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>
                {charity.impact_areas[0]} • {charity.items_received} items
              </span>
              {charity.verified && (
                <span style={{ color: "#10b981", fontFamily: "Syne, sans-serif" }}>
                  ✓ Verified
                </span>
              )}
            </div>

            {selectedCharity === charity.id && (
              <div
                className="mt-3 p-2 rounded text-center text-xs font-semibold"
                style={{
                  background: "rgba(16,185,129,0.1)",
                  color: "#10b981",
                  fontFamily: "Figtree, sans-serif",
                }}
              >
                🎯 This donation will impact ~{livesImpacted} lives
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedCharity && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "rgba(16,185,129,0.06)",
            border: "1px solid rgba(16,185,129,0.2)",
          }}
        >
          <p style={{ color: "#10b981", fontFamily: "Figtree, sans-serif", fontSize: "0.875rem" }}>
            ✅ Donation selected! This item will be picked up and delivered to the charity.
          </p>
        </div>
      )}
    </div>
  );
}
