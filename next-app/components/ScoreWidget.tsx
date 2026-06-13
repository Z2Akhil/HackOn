"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BadgeTier, GCSResponse } from "@/types";

export interface ScoreWidgetProps {
  buyerId?: string;
  mode?: "nav" | "inline";
  estimatedCredits?: number;
  awardedCredits?: number;
}

interface ScoreState {
  gcs: number;
  badgeTier: BadgeTier;
}

const getBadgeIcon = (tier: BadgeTier): string => {
  switch (tier) {
    case "Seedling":
      return "🌱";
    case "Sprout":
      return "🌿";
    case "EcoChampion":
      return "🏆";
    case "Guardian":
      return "🛡️";
    default:
      return "🌱";
  }
};

export default function ScoreWidget({
  buyerId = "b001",
  mode = "nav",
  estimatedCredits,
  awardedCredits,
}: ScoreWidgetProps) {
  const [state, setState] = useState<ScoreState | null>(null);
  const [lastKnownState, setLastKnownState] = useState<ScoreState | null>(null);
  const [error, setError] = useState(false);

  const fetchScore = async () => {
    try {
      const response = await fetch(`/api/green-credit/${buyerId}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data: GCSResponse = await response.json();
      const newState = { gcs: data.gcs, badgeTier: data.badgeTier };
      setState(newState);
      setLastKnownState(newState);
      setError(false);
    } catch (err) {
      console.error("Error fetching score:", err);
      setError(true);
    }
  };

  useEffect(() => {
    fetchScore();
    const interval = setInterval(fetchScore, 5000);
    return () => clearInterval(interval);
  }, [buyerId]);

  // Use last known state if current state is null, or use current state
  const displayState = state || lastKnownState;

  if (!displayState) {
    return null;
  }

  const icon = getBadgeIcon(displayState.badgeTier);
  const displayOpacity = error ? 0.5 : 1;

  if (mode === "nav") {
    return (
      <Link href="/profile/green-score">
        <div
          className="px-3 py-1.5 rounded-lg flex items-center gap-2 cursor-pointer transition-opacity"
          style={{
            background: "#18181b",
            border: "1px solid #27272a",
            color: "#10b981",
            fontFamily: "Figtree, sans-serif",
            opacity: displayOpacity,
          }}
        >
          <span>{icon}</span>
          <span className="text-sm font-medium">
            {displayState.gcs} pts · {displayState.badgeTier}
          </span>
        </div>
      </Link>
    );
  }

  // inline mode
  return (
    <div
      className="rounded-lg p-6 border"
      style={{
        background: "#09090b",
        border: "1px solid #27272a",
        opacity: displayOpacity,
      }}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-400" style={{ fontFamily: "Figtree, sans-serif" }}>
              Green Score
            </div>
            <div
              className="text-4xl font-bold"
              style={{ color: "#10b981", fontFamily: "Figtree, sans-serif" }}
            >
              {displayState.gcs}
            </div>
          </div>
          <div className="text-5xl">{icon}</div>
        </div>

        <div
          className="text-center py-3 rounded-lg"
          style={{
            background: "#10b98120",
            color: "#10b981",
            fontFamily: "Figtree, sans-serif",
            fontSize: "0.875rem",
            fontWeight: "600",
          }}
        >
          {displayState.badgeTier}
        </div>

        {estimatedCredits !== undefined && (
          <div
            className="p-3 rounded-lg border border-yellow-500/30"
            style={{
              background: "rgba(250, 204, 21, 0.05)",
              color: "#fbbf24",
              fontFamily: "Figtree, sans-serif",
              fontSize: "0.875rem",
            }}
          >
            <div className="font-semibold">Estimated Credits</div>
            <div>+{estimatedCredits}</div>
          </div>
        )}

        {awardedCredits !== undefined && (
          <div
            className="p-3 rounded-lg border border-green-500/30"
            style={{
              background: "rgba(16, 185, 129, 0.05)",
              color: "#10b981",
              fontFamily: "Figtree, sans-serif",
              fontSize: "0.875rem",
            }}
          >
            <div className="font-semibold">Awarded Credits</div>
            <div>+{awardedCredits}</div>
          </div>
        )}
      </div>
    </div>
  );
}
