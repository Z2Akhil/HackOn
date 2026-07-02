"use client";
import { useEffect, useState } from "react";
import { PreventionScore } from "@/types";
import { AZ } from "@/lib/ui-theme";
import { AlertTriangle, Info } from "lucide-react";

// Reason-specific framing only. Every NUMBER shown (risk %, driver, product
// return rate) comes from the live prevention model / product data — so each
// product renders a genuinely different banner, not a canned template.
const REASON_COPY: Record<string, { headline: string; tip: string }> = {
  wrong_size: {
    headline: "High size-return risk on this item",
    tip: "Check the size chart and read fit reviews — consider sizing up if you're between sizes.",
  },
  defective: {
    headline: "Elevated defect-return risk",
    tip: "Inspect on delivery and keep the packaging until you've tested it fully.",
  },
  not_as_described: {
    headline: "Listing-mismatch risk",
    tip: "Zoom into every photo and read recent reviews — buyers report it differs in person.",
  },
  changed_mind: {
    headline: "High impulse-return rate",
    tip: "Make sure it fits your use case before ordering to avoid a return trip.",
  },
  wrong_variant: {
    headline: "Variant mix-up risk",
    tip: "Double-check colour, size and model variant before adding to cart.",
  },
};

const DEFAULT_COPY = {
  headline: "Return risk flagged on this item",
  tip: "Review the product details and photos carefully before ordering.",
};

function driverLabel(d: string): string {
  return d ? d.charAt(0).toUpperCase() + d.slice(1) : "multiple risk factors";
}

export default function PreventionBanner({
  productId,
  category,
  topReturnReason,
  avgReturnRate,
}: {
  productId: string;
  category: string;
  topReturnReason: string;
  avgReturnRate?: number;
}) {
  const [score, setScore] = useState<(PreventionScore & { mock?: boolean }) | null>(null);
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

  const isHigh = score.recommended_intervention === "show_banner_with_variant_suggestion";
  const accent = isHigh ? AZ.red : AZ.amber;
  const accentBg = isHigh ? AZ.redBg : AZ.amberBg;
  const Icon = isHigh ? AlertTriangle : Info;

  const riskPct = Math.round(score.risk * 100);
  const productRatePct = avgReturnRate != null ? Math.round(avgReturnRate * 100) : null;
  const copy = REASON_COPY[topReturnReason] ?? DEFAULT_COPY;
  const tier = isHigh ? "High return risk" : "Heads up";

  return (
    <div className="rounded-lg p-3 animate-fade-in" style={{ background: accentBg, border: `1px solid ${accent}33` }}>
      {/* Header — tier + live risk score */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Icon size={14} color={accent} />
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: accent, fontFamily: "Figtree, sans-serif" }}>
            AI Return Prevention · {tier}
          </span>
        </div>
        <span className="text-xs font-bold tabular-nums" style={{ color: accent, fontFamily: "Figtree, sans-serif" }}>
          {riskPct}% risk
        </span>
      </div>

      {/* Risk meter — bar width = model's risk score */}
      <div className="h-1.5 rounded-full mb-2 overflow-hidden" style={{ background: `${accent}22` }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${riskPct}%`, background: accent }} />
      </div>

      {/* Content — all numbers are model / product derived */}
      <p className="text-sm font-semibold mb-1" style={{ color: AZ.ink, fontFamily: "Figtree, sans-serif" }}>
        {copy.headline}
      </p>
      <p className="text-xs leading-relaxed" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
        Our model estimates a <strong>{riskPct}%</strong> chance you&apos;ll return this, driven mainly by{" "}
        <strong>{driverLabel(score.top_driver)}</strong>
        {productRatePct != null ? (
          <>
            {" "}· this item is returned <strong>{productRatePct}%</strong> of the time
          </>
        ) : null}
        . {copy.tip}
      </p>
    </div>
  );
}
