"use client";
import { useEffect, useState } from "react";
import { PreventionScore } from "@/types";

const REASON_NOTE: Record<string, { headline: string; detail: string }> = {
  wrong_size:       { headline: "Size mismatch is common for this product",  detail: "Many buyers return this item due to sizing. Check the size chart carefully and read reviews for fit guidance before ordering." },
  defective:        { headline: "Some buyers reported quality issues",       detail: "A portion of returns on this product cite defects on arrival. Inspect carefully upon delivery." },
  not_as_described: { headline: "Product may differ from listing photos",    detail: "Several buyers noted the item looked different in person. Check all photos and reviews before purchasing." },
  changed_mind:     { headline: "High impulse-return rate on this product",  detail: "Customers frequently return this item after reconsideration. Make sure it fits your use case before buying." },
  wrong_variant:    { headline: "Variant mix-ups are common here",           detail: "Double-check colour, size, and model variant before adding to cart — wrong variant is the top return reason." },
};

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

  if (loading) return <div className="h-24 rounded-xl skeleton" />;
  if (!score || score.recommended_intervention === "none") return null;

  const isHighRisk = score.recommended_intervention === "show_banner_with_variant_suggestion";
  const note = REASON_NOTE[topReturnReason] ?? {
    headline: "Some buyers have returned this product",
    detail: "Check reviews before purchasing.",
  };

  return (
    <div
      className="rounded-xl p-4 animate-fade-in"
      style={{
        background: "#111113",
        border: "1px solid #27272a",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: isHighRisk ? "#ef4444" : "#f59e0b" }} />
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>
          Buyer Insight · AI
        </span>
      </div>

      {/* Note content */}
      <p className="text-sm font-semibold mb-1" style={{ color: "#fafafa", fontFamily: "Figtree, sans-serif" }}>
        {note.headline}
      </p>
      <p className="text-xs leading-relaxed" style={{ color: "#71717a", fontFamily: "Figtree, sans-serif" }}>
        {note.detail}
      </p>
    </div>
  );
}
