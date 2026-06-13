"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { GCSResponse, EcoAction, GreenVoucher, BadgeTier } from "@/types";

const BADGE_CONFIG: Record<BadgeTier, { icon: string; description: string }> = {
  Seedling: {
    icon: "🌱",
    description: "Just starting your eco journey. Every action counts!",
  },
  Sprout: {
    icon: "🌿",
    description: "You're growing your impact. Keep up the sustainability!",
  },
  EcoChampion: {
    icon: "🏆",
    description: "Champion of eco-friendly choices. You're making a difference!",
  },
  Guardian: {
    icon: "🛡️",
    description: "Guardian of our planet. Your commitment is inspiring!",
  },
};

const TIER_MILESTONES: Record<BadgeTier, [number, number]> = {
  Seedling: [0, 199],
  Sprout: [200, 499],
  EcoChampion: [500, 799],
  Guardian: [800, 1000],
};

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateWithTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

function getRelativeTime(isoString: string): string {
  const now = new Date();
  const then = new Date(isoString);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(isoString);
}

function CircularProgressRing({
  gcs,
  badgeTier,
}: {
  gcs: number;
  badgeTier: BadgeTier;
}): React.ReactElement {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const [tierMin, tierMax] = TIER_MILESTONES[badgeTier];
  const progressPct = ((gcs - tierMin) / (tierMax - tierMin)) * 100;
  const strokeDashoffset = circumference - (progressPct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={120} height={120} viewBox="0 0 120 120">
        {/* Background circle */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#18181b"
          strokeWidth="3"
        />
        {/* Progress circle */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#10b981"
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: "60px 60px",
            transition: "stroke-dashoffset 0.3s ease",
          }}
        />
      </svg>
      <div className="text-center">
        <div
          className="text-4xl font-black"
          style={{ color: "#10b981", fontFamily: "Syne, sans-serif" }}
        >
          {gcs}
        </div>
        <div
          className="text-xs uppercase tracking-widest mt-1"
          style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}
        >
          Green Credits
        </div>
      </div>
    </div>
  );
}

function SkeletonLoader(): React.ReactElement {
  return (
    <div className="max-w-4xl mx-auto px-5 py-10 space-y-8">
      {/* Hero skeleton */}
      <div className="rounded-2xl p-8" style={{ background: "#111113", border: "1px solid #27272a" }}>
        <div className="flex flex-col items-center gap-6">
          <div className="w-32 h-32 rounded-full animate-pulse" style={{ background: "#18181b" }} />
          <div className="h-8 w-24 rounded animate-pulse" style={{ background: "#18181b" }} />
          <div className="h-4 w-32 rounded animate-pulse" style={{ background: "#18181b" }} />
        </div>
      </div>

      {/* Badge tier skeleton */}
      <div className="rounded-2xl p-6" style={{ background: "#111113", border: "1px solid #27272a" }}>
        <div className="space-y-4">
          <div className="h-6 w-32 rounded animate-pulse" style={{ background: "#18181b" }} />
          <div className="h-4 w-full rounded animate-pulse" style={{ background: "#18181b" }} />
          <div className="h-2 w-full rounded-full animate-pulse" style={{ background: "#18181b" }} />
        </div>
      </div>

      {/* Vouchers skeleton */}
      <div>
        <div className="h-6 w-32 rounded animate-pulse mb-4" style={{ background: "#18181b" }} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: "#111113", border: "1px solid #27272a" }}>
              <div className="h-5 w-24 rounded animate-pulse mb-3" style={{ background: "#18181b" }} />
              <div className="h-4 w-16 rounded animate-pulse mb-2" style={{ background: "#18181b" }} />
              <div className="h-4 w-20 rounded animate-pulse" style={{ background: "#18181b" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorCard({ onRetry }: { onRetry: () => void }): React.ReactElement {
  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <div
        className="rounded-2xl p-8 text-center"
        style={{ background: "#111113", border: "1px solid #ef4444" }}
      >
        <div className="text-3xl mb-3">⚠️</div>
        <h2
          className="text-xl font-bold mb-2"
          style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}
        >
          Unable to Load Profile
        </h2>
        <p
          className="text-sm mb-6"
          style={{ color: "#a1a1aa", fontFamily: "Figtree, sans-serif" }}
        >
          We couldn't fetch your green credit profile. Please try again.
        </p>
        <button
          onClick={onRetry}
          className="px-6 py-2 rounded-lg font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
          style={{
            background: "#10b981",
            color: "#0c0c0e",
            fontFamily: "Figtree, sans-serif",
          }}
        >
          Retry
        </button>
      </div>
    </div>
  );
}

function EmptyState(): React.ReactElement {
  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <div
        className="rounded-2xl p-12 text-center"
        style={{ background: "#111113", border: "1px solid #27272a" }}
      >
        <div className="text-6xl mb-4">🌱</div>
        <h2
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}
        >
          Start Your Eco Journey
        </h2>
        <p
          className="text-sm mb-8"
          style={{ color: "#a1a1aa", fontFamily: "Figtree, sans-serif", maxWidth: "400px", marginLeft: "auto", marginRight: "auto" }}
        >
          Your first eco-friendly action will appear here. Return items responsibly, make sustainable purchases, or choose carbon-neutral shipping to earn green credits.
        </p>
        <Link
          href="/marketplace"
          className="inline-block px-6 py-2 rounded-lg font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
          style={{
            background: "#10b981",
            color: "#0c0c0e",
            fontFamily: "Figtree, sans-serif",
          }}
        >
          Explore Marketplace
        </Link>
      </div>
    </div>
  );
}

export default function GCSProfilePage(): React.ReactElement {
  const [data, setData] = useState<GCSResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchGCS = async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await fetch("/api/green-credit/b001");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("GCS fetch error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGCS();
  }, []);

  if (loading) return <SkeletonLoader />;
  if (error || !data) return <ErrorCard onRetry={fetchGCS} />;
  if (data.actionLog.length === 0) return <EmptyState />;

  const currentTierConfig = BADGE_CONFIG[data.badgeTier];
  const [tierMin, tierMax] = TIER_MILESTONES[data.badgeTier];
  const creditsToNext =
    data.badgeTier === "Guardian"
      ? 0
      : TIER_MILESTONES[
          (["Seedling", "Sprout", "EcoChampion", "Guardian"].find(
            (t) => TIER_MILESTONES[t as BadgeTier][0] > tierMax
          ) || "Guardian") as BadgeTier
        ][0] - data.gcs;

  return (
    <div className="max-w-4xl mx-auto px-5 py-10 space-y-8">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm transition-colors"
        style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}
      >
        <span>←</span> Back to home
      </Link>

      {/* Hero Card */}
      <div
        className="rounded-2xl p-8"
        style={{ background: "#111113", border: "1px solid #27272a" }}
      >
        <div className="flex flex-col items-center gap-6">
          <CircularProgressRing gcs={data.gcs} badgeTier={data.badgeTier} />
          <div className="text-center">
            <div className="text-4xl mb-2">{currentTierConfig.icon}</div>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}
            >
              {data.badgeTier}
            </h1>
            <p
              className="text-sm mt-2"
              style={{ color: "#a1a1aa", fontFamily: "Figtree, sans-serif" }}
            >
              {currentTierConfig.description}
            </p>
          </div>
        </div>
      </div>

      {/* Badge Tier Card */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "#111113", border: "1px solid #27272a" }}
      >
        <div className="space-y-4">
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-1"
              style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}
            >
              Current Tier
            </p>
            <p
              className="text-lg font-bold"
              style={{ color: "#10b981", fontFamily: "Syne, sans-serif" }}
            >
              {data.badgeTier}
            </p>
          </div>
          <p
            className="text-sm"
            style={{ color: "#a1a1aa", fontFamily: "Figtree, sans-serif" }}
          >
            {currentTierConfig.description}
          </p>
          {data.badgeTier !== "Guardian" && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <span
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}
                >
                  Progress to Next Tier
                </span>
                <span
                  className="text-xs font-bold"
                  style={{ color: "#10b981", fontFamily: "Figtree, sans-serif" }}
                >
                  {creditsToNext} credits needed
                </span>
              </div>
              <div
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ background: "#18181b" }}
              >
                <div
                  className="h-full transition-all"
                  style={{
                    background: "#10b981",
                    width: `${Math.min(100, ((data.gcs - tierMin) / (tierMax - tierMin + creditsToNext)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vouchers Section */}
      {data.vouchers.length > 0 && (
        <div>
          <h2
            className="text-lg font-bold mb-4"
            style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}
          >
            🎟️ Your Vouchers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.vouchers.map((voucher: GreenVoucher) => (
              <div
                key={voucher.id}
                className="rounded-xl p-4"
                style={{
                  background: "#111113",
                  border: `1px solid ${voucher.status === "active" ? "#10b981" : "#27272a"}`,
                }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p
                      className="text-sm font-bold"
                      style={{ color: "#fafafa", fontFamily: "Syne, sans-serif" }}
                    >
                      {voucher.code}
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}
                    >
                      {voucher.discountPct}% Discount
                    </p>
                  </div>
                  <div
                    className="px-2 py-1 rounded text-xs font-semibold"
                    style={{
                      background:
                        voucher.status === "active"
                          ? "rgba(16,185,129,0.1)"
                          : "rgba(113,113,122,0.1)",
                      color:
                        voucher.status === "active" ? "#10b981" : "#a1a1aa",
                      fontFamily: "Figtree, sans-serif",
                    }}
                  >
                    {voucher.status === "active" ? "Active" : "Expired"}
                  </div>
                </div>
                <p
                  className="text-xs"
                  style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}
                >
                  Expires {formatDate(voucher.expiresAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Log */}
      {data.actionLog.length > 0 && (
        <div>
          <h2
            className="text-lg font-bold mb-4"
            style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}
          >
            📋 Action Log
          </h2>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "#111113", border: "1px solid #27272a" }}
          >
            <div
              className="max-h-96 overflow-y-auto"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "#27272a #111113",
              }}
            >
              {data.actionLog.map((action: EcoAction, i: number) => (
                <div
                  key={action.id}
                  className="px-6 py-4 flex justify-between items-start"
                  style={{
                    borderBottom:
                      i < data.actionLog.length - 1
                        ? "1px solid #27272a"
                        : "none",
                  }}
                >
                  <div className="flex-1">
                    <p
                      className="text-sm font-medium"
                      style={{ color: "#fafafa", fontFamily: "Figtree, sans-serif" }}
                    >
                      {action.description}
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}
                    >
                      {getRelativeTime(action.timestamp)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className="text-sm font-bold"
                      style={{
                        color: action.delta >= 0 ? "#10b981" : "#ef4444",
                        fontFamily: "Syne, sans-serif",
                      }}
                    >
                      {action.delta >= 0 ? "+" : ""}{action.delta}
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}
                    >
                      {formatDate(action.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
