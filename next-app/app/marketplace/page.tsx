"use client";
import { useEffect, useState } from "react";
import { MarketplaceListing } from "@/types";
import PassportModal from "@/components/PassportModal";

const GRADE_BADGE: Record<string, { color: string; bg: string; border: string }> = {
  "A":  { color: "#10b981", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.25)" },
  "A-": { color: "#34d399", bg: "rgba(52,211,153,0.1)",  border: "rgba(52,211,153,0.25)" },
  "B+": { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)" },
  "B":  { color: "#f97316", bg: "rgba(249,115,22,0.1)",  border: "rgba(249,115,22,0.25)" },
  "C":  { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)" },
};

function categoryEmoji(cat: string) {
  const m: Record<string, string> = { electronics: "📱", apparel: "👕", home_appliances: "🏠", home: "🛋️", accessories: "⌚", beauty: "💄", sports: "🏃" };
  return m[cat] ?? "📦";
}

type FilterKey = "All" | "Electronics" | "Apparel" | "Home" | "Grade A" | "Grade A-";
const FILTERS: FilterKey[] = ["All", "Electronics", "Apparel", "Home", "Grade A", "Grade A-"];

function applyFilter(listings: MarketplaceListing[], filter: FilterKey): MarketplaceListing[] {
  switch (filter) {
    case "Electronics": return listings.filter(l => l.category === "electronics");
    case "Apparel":     return listings.filter(l => l.category === "apparel");
    case "Home":        return listings.filter(l => l.category === "home" || l.category === "home_appliances");
    case "Grade A":     return listings.filter(l => l.grade.grade === "A");
    case "Grade A-":    return listings.filter(l => l.grade.grade === "A-");
    default:            return listings;
  }
}

export default function MarketplacePage() {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [selected, setSelected] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("All");

  useEffect(() => {
    fetch("/api/marketplace").then((r) => r.json()).then(setListings).finally(() => setLoading(false));
  }, []);

  const filtered = applyFilter(listings, activeFilter);

  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <div className="flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full mb-3" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <span className="text-xs font-semibold" style={{ color: "#10b981", fontFamily: "Figtree, sans-serif" }}>AI-Certified Open-Box</span>
            </div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>Marketplace</h1>
            <p className="text-sm mt-1.5 max-w-md" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>
              Every listing has an AI-graded condition passport. Buy refurbished with full confidence.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg" style={{ background: "#18181b", border: "1px solid #27272a", color: "#52525b", fontFamily: "Figtree, sans-serif" }}>
            {loading ? "…" : filtered.length} listings
          </div>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 mb-6 animate-fade-up delay-1">
        {FILTERS.map((f) => {
          const active = f === activeFilter;
          return (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: active ? "rgba(16,185,129,0.1)" : "#111113",
                border: active ? "1px solid rgba(16,185,129,0.3)" : "1px solid #27272a",
                color: active ? "#10b981" : "#52525b",
                fontFamily: "Figtree, sans-serif",
              }}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-72 rounded-xl skeleton" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-semibold" style={{ color: "#fafafa", fontFamily: "Figtree, sans-serif" }}>No listings for this filter</p>
          <button onClick={() => setActiveFilter("All")} className="text-sm mt-2" style={{ color: "#10b981" }}>Clear filter</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((listing, i) => {
            const badge = GRADE_BADGE[listing.grade.grade] ?? GRADE_BADGE["B+"];
            const discount = Math.round((1 - listing.asking_price / listing.mrp) * 100);
            return (
              <button
                key={listing.id}
                onClick={() => setSelected(listing)}
                className="text-left rounded-xl overflow-hidden transition-all group animate-fade-up"
                style={{ background: "#111113", border: "1px solid #27272a", animationDelay: `${i * 40}ms` }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#3f3f46"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 30px rgba(0,0,0,0.5)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#27272a"; (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = ""; }}
              >
                {/* Image */}
                <div className="aspect-square flex items-center justify-center text-5xl relative overflow-hidden" style={{ background: "#18181b" }}>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "radial-gradient(circle, rgba(16,185,129,0.06), transparent 70%)" }} />
                  {listing.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={listing.image} alt={listing.product_name} className="w-full h-full object-cover" />
                  ) : (
                    categoryEmoji(listing.category)
                  )}
                  {/* Discount badge */}
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-xs font-black" style={{ background: "#10b981", color: "#0c0c0e", fontFamily: "Syne, sans-serif", zIndex: 1 }}>
                    -{discount}%
                  </div>
                </div>

                <div className="p-3 space-y-2">
                  <p className="text-sm font-semibold line-clamp-2 leading-snug" style={{ color: "#fafafa", fontFamily: "Figtree, sans-serif" }}>
                    {listing.product_name}
                  </p>

                  {/* Grade badge */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color }}>
                      Grade {listing.grade.grade}
                    </span>
                    <span className="text-xs" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>AI-verified</span>
                  </div>

                  {/* Pricing */}
                  <div>
                    <div className="font-bold text-base" style={{ color: "#fafafa", fontFamily: "Syne, sans-serif" }}>
                      ₹{listing.asking_price.toLocaleString("en-IN")}
                    </div>
                    <div className="text-xs line-through" style={{ color: "#3f3f46" }}>
                      ₹{listing.mrp.toLocaleString("en-IN")}
                    </div>
                  </div>

                  {/* Circularity */}
                  {listing.circularity_score != null && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold" style={{ color: "#10b981", fontFamily: "Figtree, sans-serif" }}>
                        ♻ {listing.circularity_score}/100
                      </span>
                      <span className="text-xs" style={{ color: "#52525b" }}>circularity</span>
                    </div>
                  )}

                  <div className="text-xs font-medium" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>
                    View Passport →
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && <PassportModal listing={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
