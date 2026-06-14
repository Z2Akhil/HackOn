"use client";
import { useEffect, useState } from "react";
import { PreventionScore } from "@/types";
import { AZ } from "@/lib/ui-theme";
import { AlertTriangle } from "lucide-react";

// Pre-computed from returns_train.csv (2000 rows) — category × reason frequency
const CATEGORY_STATS: Record<string, { reason: string; pct: number }> = {
  apparel:        { reason: "wrong_size",       pct: 84 },
  electronics:    { reason: "defective",        pct: 82 },
  home:           { reason: "not_as_described", pct: 100 },
  home_appliances:{ reason: "defective",        pct: 100 },
  accessories:    { reason: "not_as_described", pct: 100 },
  beauty:         { reason: "not_as_described", pct: 100 },
  sports:         { reason: "not_as_described", pct: 100 },
};

function getNote(category: string, reason: string): { headline: string; detail: string } {
  const stat = CATEGORY_STATS[category];
  const pct = stat?.reason === reason ? stat.pct : null;
  const pctStr = pct ? `${pct}% of returns` : "Many returns";

  switch (reason) {
    case "wrong_size":
      return {
        headline: "Size mismatch is the top return reason here",
        detail: `${pctStr} in this category cite size mismatch. Check the size chart carefully and read fit reviews before ordering.`,
      };
    case "defective":
      return {
        headline: "Quality issues reported by buyers",
        detail: `${pctStr} in this category cite defects on arrival. Inspect carefully upon delivery and keep packaging for returns.`,
      };
    case "not_as_described":
      return {
        headline: "Product may differ from listing photos",
        detail: `${pctStr} in this category note the item looked different in person. Check all photos and read recent reviews before purchasing.`,
      };
    case "changed_mind":
      return {
        headline: "High impulse-return rate on this product",
        detail: "Customers frequently return this after reconsideration. Make sure it fits your use case before buying.",
      };
    case "wrong_variant":
      return {
        headline: "Variant mix-ups are common here",
        detail: "Double-check colour, size, and model variant before adding to cart — wrong variant is the top return reason.",
      };
    default:
      return {
        headline: "Some buyers have returned this product",
        detail: "Check reviews carefully before purchasing.",
      };
  }
}

export default function PreventionBanner({
  productId, category, topReturnReason,
}: {
  productId: string; category: string; topReturnReason: string;
}) {
  const [score, setScore] = useState<PreventionScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/prevention/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: "demo_sneha",
        product_id: productId,
        variant: category === "apparel" ? "mismatch" : "standard",
        customer_total_returns: 4,
        customer_lifetime_orders: 22,
        customer_category_return_rate: 0.18,
      }),
    })
      .then((r) => r.json())
      .then(setScore)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [productId, category]);

  if (loading) return <div className="h-24 rounded-lg skeleton" />;
  if (!score || score.recommended_intervention === "none") return null;

  const isHighRisk = score.recommended_intervention === "show_banner_with_variant_suggestion";
  const note = getNote(category, topReturnReason);
  const accent = isHighRisk ? AZ.red : AZ.amber;
  const accentBg = isHighRisk ? AZ.redBg : AZ.amberBg;

  return (
    <div className="rounded-lg p-3 animate-fade-in" style={{ background: accentBg, border: `1px solid ${accent}33` }}>
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <AlertTriangle size={14} color={accent} />
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: accent, fontFamily: "Figtree, sans-serif" }}>
          Buyer Insight · AI Return Prevention
        </span>
      </div>

      {/* Note content */}
      <p className="text-sm font-semibold mb-1" style={{ color: AZ.ink, fontFamily: "Figtree, sans-serif" }}>
        {note.headline}
      </p>
      <p className="text-xs leading-relaxed" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
        {note.detail}
      </p>
    </div>
  );
}
