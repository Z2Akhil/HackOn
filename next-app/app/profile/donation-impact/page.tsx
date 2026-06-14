"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DonationRecord, DonationImpact } from "@/types";

interface DonationData {
  donations: DonationRecord[];
  impact: DonationImpact;
  count: number;
}

export default function DonationImpactPage() {
  const [data, setData] = useState<DonationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const buyerId = "b001"; // In production, get from auth

  useEffect(() => {
    const fetchDonations = async () => {
      try {
        setLoading(true);
        setError(false);
        const response = await fetch(`/api/donations?buyerId=${buyerId}`);
        if (!response.ok) throw new Error("Failed to fetch donations");
        const json = await response.json();
        setData(json);
      } catch (err) {
        console.error("Fetch error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchDonations();
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-10">
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl animate-pulse" style={{ background: "#18181b" }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-10">
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: "#111113", border: "1px solid #27272a" }}
        >
          <div className="text-3xl mb-3">❌</div>
          <h2 className="font-bold mb-2" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>
            Error Loading Donations
          </h2>
          <p style={{ color: "#a1a1aa" }}>Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-10 space-y-8">
      {/* Back Link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm transition-colors"
        style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}
      >
        <span>←</span> Back to home
      </Link>

      {/* Hero Section */}
      <div
        className="rounded-2xl p-8 text-center"
        style={{ background: "#111113", border: "1px solid #27272a" }}
      >
        <div className="text-5xl mb-4">💝</div>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>
          Your Donation Impact
        </h1>
        <p style={{ color: "#a1a1aa", fontFamily: "Figtree, sans-serif" }}>
          Every donation creates real change in communities across India
        </p>
      </div>

      {/* Impact Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon="📦"
          label="Items Donated"
          value={data.impact.total_items_donated}
          description="Direct donations"
        />
        <MetricCard
          icon="💰"
          label="Value Donated"
          value={`₹${(data.impact.total_value_donated_inr / 1000).toFixed(1)}k`}
          description="Market value"
        />
        <MetricCard
          icon="❤️"
          label="Lives Impacted"
          value={data.impact.lives_impacted}
          description="Estimated reach"
        />
        <MetricCard
          icon="🏢"
          label="Charities Supported"
          value={data.impact.charities_supported.length}
          description="Organizations helped"
        />
      </div>

      {/* No Donations State */}
      {data.count === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: "#111113", border: "1px solid #27272a" }}
        >
          <div className="text-6xl mb-4">🎁</div>
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>
            Start Donating
          </h2>
          <p className="mb-6" style={{ color: "#a1a1aa", fontFamily: "Figtree, sans-serif" }}>
            When you return items marked for donation, they'll be matched with nearby charities here.
          </p>
          <Link
            href="/return"
            className="inline-block px-6 py-2 rounded-lg font-semibold transition-all"
            style={{
              background: "#10b981",
              color: "#0c0c0e",
              fontFamily: "Figtree, sans-serif",
            }}
          >
            Return an Item
          </Link>
        </div>
      ) : (
        <>
          {/* Category Breakdown */}
          <div className="rounded-2xl p-6" style={{ background: "#111113", border: "1px solid #27272a" }}>
            <h2 className="font-bold mb-4" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>
              Donations by Category
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(data.impact.categories).map(([category, count]) => (
                <div
                  key={category}
                  className="rounded-lg p-3"
                  style={{ background: "#18181b", border: "1px solid #27272a" }}
                >
                  <div className="text-sm font-bold" style={{ color: "#10b981", fontFamily: "Syne, sans-serif" }}>
                    {count}
                  </div>
                  <div className="text-xs capitalize" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>
                    {category.replace("_", " ")}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Donation History */}
          <div className="rounded-2xl p-6" style={{ background: "#111113", border: "1px solid #27272a" }}>
            <h2 className="font-bold mb-4" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>
              Donation History
            </h2>
            <div className="space-y-3">
              {data.donations.map((donation, i) => (
                <div
                  key={donation.id}
                  className="flex items-center justify-between p-4 rounded-lg"
                  style={{
                    background: "#18181b",
                    border: "1px solid #27272a",
                  }}
                >
                  <div>
                    <div className="font-bold text-sm" style={{ fontFamily: "Figtree, sans-serif", color: "#fafafa" }}>
                      {donation.product_name}
                    </div>
                    <div className="text-xs mt-1" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>
                      {new Date(donation.donated_at).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                      {" • "}
                      <span className="capitalize">{donation.delivery_status.replace("_", " ")}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold" style={{ color: "#10b981", fontFamily: "Syne, sans-serif" }}>
                      ₹{donation.mrp}
                    </div>
                    <div className="text-xs mt-1" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>
                      ~{donation.lives_impacted_estimate} lives
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Call to Action */}
      {data.count > 0 && (
        <div
          className="rounded-2xl p-6 text-center"
          style={{
            background: "rgba(16,185,129,0.06)",
            border: "1px solid rgba(16,185,129,0.2)",
          }}
        >
          <p className="font-bold mb-3" style={{ color: "#10b981", fontFamily: "Figtree, sans-serif" }}>
            Keep making an impact! 🌟
          </p>
          <p className="text-sm mb-4" style={{ color: "#a1a1aa", fontFamily: "Figtree, sans-serif" }}>
            Every donation helps rebuild communities. Ready to contribute more?
          </p>
          <Link
            href="/return"
            className="inline-block px-6 py-2 rounded-lg font-semibold transition-all"
            style={{
              background: "#10b981",
              color: "#0c0c0e",
              fontFamily: "Figtree, sans-serif",
            }}
          >
            Donate Another Item
          </Link>
        </div>
      )}
    </div>
  );
}

// Metric Card Component
function MetricCard({
  icon,
  label,
  value,
  description,
}: {
  icon: string;
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "#111113", border: "1px solid #27272a" }}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-lg font-bold" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>
        {value}
      </div>
      <div className="text-xs mt-2" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>
        {label}
      </div>
      <div className="text-xs mt-1" style={{ color: "#71717a", fontFamily: "Figtree, sans-serif" }}>
        {description}
      </div>
    </div>
  );
}
