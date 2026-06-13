"use client";
import { useEffect, useState } from "react";
import { MarketplaceListing } from "@/types";

interface Match {
  buyer: { id: string; name: string; price_band: string; eco_preference: number };
  score: number;
  reason: string;
}

const GRADE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  "A":  { label: "Like New",       color: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.2)" },
  "A-": { label: "Minor Cosmetic", color: "#34d399", bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.2)" },
  "B+": { label: "Moderate Wear",  color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)" },
  "B":  { label: "Heavy Wear",     color: "#f97316", bg: "rgba(249,115,22,0.08)",  border: "rgba(249,115,22,0.2)" },
  "C":  { label: "Poor",           color: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.2)" },
};

function CircularityBar({ score }: { score: number }) {
  const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const label = score >= 75 ? "High" : score >= 50 ? "Medium" : "Low";
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>Circularity Score</span>
        <span className="text-sm font-black" style={{ color, fontFamily: "Syne, sans-serif" }}>{score}/100 · {label}</span>
      </div>
      <div className="h-2 rounded-full" style={{ background: "#27272a" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  );
}

export default function PassportModal({ listing, onClose }: { listing: MarketplaceListing; onClose: () => void }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const cfg = GRADE_CONFIG[listing.grade.grade] ?? GRADE_CONFIG["B+"];
  const discount = Math.round((1 - listing.asking_price / listing.mrp) * 100);

  useEffect(() => {
    fetch(`/api/match/${listing.id}`)
      .then((r) => r.json())
      .then((d) => setMatches(d.matches ?? []))
      .catch(() => setMatches([]))
      .finally(() => setLoadingMatches(false));
  }, [listing.id]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl animate-fade-up"
        style={{ background: "#111113", border: "1px solid #27272a", boxShadow: "0 25px 80px rgba(0,0,0,0.6)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6" style={{ borderBottom: "1px solid #27272a" }}>
          <div className="flex items-start gap-4">
            {/* Product thumbnail */}
            <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center text-3xl" style={{ background: "#18181b", border: "1px solid #27272a" }}>
              {listing.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={listing.image} alt={listing.product_name} className="w-full h-full object-cover" />
              ) : "📦"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>
                  AI Product Passport
                </div>
                <div className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)", fontFamily: "Figtree, sans-serif" }}>
                  AI-Verified
                </div>
              </div>
              <h2 className="text-xl font-bold leading-tight" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>
                {listing.product_name}
              </h2>
              <p className="text-sm mt-0.5 capitalize" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>
                {listing.category.replace(/_/g, " ")}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all flex-shrink-0"
              style={{ background: "#18181b", color: "#52525b", border: "1px solid #27272a" }}
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Grade block */}
          <div className="rounded-xl p-4" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl font-black" style={{ background: cfg.bg, border: `2px solid ${cfg.border}`, color: cfg.color, fontFamily: "Syne, sans-serif" }}>
                  {listing.grade.grade}
                </div>
                <div>
                  <p className="font-bold text-lg" style={{ color: "#fafafa", fontFamily: "Syne, sans-serif" }}>{cfg.label}</p>
                  <p className="text-sm" style={{ color: cfg.color, fontFamily: "Figtree, sans-serif" }}>
                    {listing.grade.functional_risk} functional risk
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black" style={{ color: cfg.color, fontFamily: "Syne, sans-serif" }}>
                  {Math.round(listing.grade.confidence * 100)}%
                </p>
                <p className="text-xs" style={{ color: "#52525b" }}>AI confidence</p>
              </div>
            </div>
          </div>

          {/* Circularity score */}
          {listing.circularity_score != null && (
            <div className="rounded-xl p-4" style={{ background: "#18181b", border: "1px solid #27272a" }}>
              <CircularityBar score={listing.circularity_score} />
            </div>
          )}

          {/* Sustainability metrics row */}
          <div className="grid grid-cols-3 gap-2">
            {listing.co2_saved_kg != null && (
              <div className="rounded-xl p-3 text-center" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
                <p className="text-base font-black" style={{ color: "#10b981", fontFamily: "Syne, sans-serif" }}>{listing.co2_saved_kg}kg</p>
                <p className="text-xs mt-0.5" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>CO₂ saved</p>
              </div>
            )}
            {listing.expected_lifespan_years != null && (
              <div className="rounded-xl p-3 text-center" style={{ background: "#18181b", border: "1px solid #27272a" }}>
                <p className="text-base font-black" style={{ color: "#fafafa", fontFamily: "Syne, sans-serif" }}>{listing.expected_lifespan_years}yr</p>
                <p className="text-xs mt-0.5" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>Est. lifespan</p>
              </div>
            )}
            {listing.warranty_months != null && (
              <div className="rounded-xl p-3 text-center" style={{ background: "#18181b", border: "1px solid #27272a" }}>
                <p className="text-base font-black" style={{ color: "#fafafa", fontFamily: "Syne, sans-serif" }}>{listing.warranty_months}mo</p>
                <p className="text-xs mt-0.5" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>Warranty</p>
              </div>
            )}
          </div>

          {/* Detail grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Packaging", value: listing.grade.packaging_status.replace(/_/g, " ") },
              { label: "Accessories", value: listing.grade.accessories_complete ? "✓ Complete" : "✗ Incomplete", color: listing.grade.accessories_complete ? "#10b981" : "#ef4444" },
              { label: "Defects", value: listing.grade.defects.length === 0 ? "None detected" : `${listing.grade.defects.length} noted`, color: listing.grade.defects.length === 0 ? "#10b981" : "#f59e0b" },
              { label: "Category", value: listing.category.replace(/_/g, " "), capitalize: true },
            ].map((item) => (
              <div key={item.label} className="rounded-lg p-3" style={{ background: "#18181b", border: "1px solid #27272a" }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>{item.label}</p>
                <p className="text-sm font-semibold capitalize" style={{ color: (item as any).color ?? "#a1a1aa", fontFamily: "Figtree, sans-serif" }}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Defect list */}
          {listing.grade.defects.length > 0 && (
            <div className="rounded-xl p-4" style={{ background: "#18181b", border: "1px solid #27272a" }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>Defect Details</p>
              {listing.grade.defects.map((d, i) => (
                <div key={i} className="flex items-start gap-2 text-sm" style={{ color: "#a1a1aa", fontFamily: "Figtree, sans-serif" }}>
                  <span style={{ color: "#f59e0b" }}>·</span> {d}
                </div>
              ))}
            </div>
          )}

          {/* Pricing */}
          <div className="rounded-xl p-4" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#10b981", fontFamily: "Figtree, sans-serif" }}>Your Price</p>
                <p className="text-3xl font-black" style={{ color: "#fafafa", fontFamily: "Syne, sans-serif" }}>
                  ₹{listing.asking_price.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg line-through" style={{ color: "#3f3f46", fontFamily: "Syne, sans-serif" }}>
                  ₹{listing.mrp.toLocaleString("en-IN")}
                </p>
                <div className="text-lg font-black" style={{ color: "#10b981", fontFamily: "Syne, sans-serif" }}>-{discount}%</div>
              </div>
            </div>
          </div>

          {/* Buyer matches */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>
              AI Next-Best-Owner Matches
            </p>
            {loadingMatches ? (
              <div className="space-y-2">
                {[1,2].map(i => <div key={i} className="h-14 rounded-xl skeleton" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {matches.map((m, i) => (
                  <div
                    key={m.buyer.id}
                    className="flex items-center justify-between rounded-xl p-3.5"
                    style={{
                      background: i === 0 ? "rgba(16,185,129,0.06)" : "#18181b",
                      border: i === 0 ? "1px solid rgba(16,185,129,0.2)" : "1px solid #27272a",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: i === 0 ? "rgba(16,185,129,0.15)" : "#27272a", color: i === 0 ? "#10b981" : "#52525b", fontFamily: "Syne, sans-serif" }}>
                        {m.buyer.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "#fafafa", fontFamily: "Figtree, sans-serif" }}>{m.buyer.name}</p>
                        <p className="text-xs" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>{m.reason}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {i === 0 && <p className="text-xs font-semibold" style={{ color: "#10b981", fontFamily: "Figtree, sans-serif" }}>Best match</p>}
                      <p className="font-bold text-sm" style={{ color: i === 0 ? "#10b981" : "#52525b", fontFamily: "Syne, sans-serif" }}>{m.score}pts</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button className="w-full font-semibold py-4 rounded-xl text-base transition-all hover:opacity-90 active:scale-[0.98]" style={{ background: "#10b981", color: "#0c0c0e", fontFamily: "Figtree, sans-serif" }}>
            Buy Now — ₹{listing.asking_price.toLocaleString("en-IN")}
          </button>
        </div>
      </div>
    </div>
  );
}
