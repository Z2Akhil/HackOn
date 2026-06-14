"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import PassportModal from "@/components/PassportModal";
import { MarketplaceListing } from "@/types";

const CDN = "https://cdn.dummyjson.com/product-images";

const GRADE_COLOR: Record<string, string> = {
  "A": "#10b981", "A-": "#34d399", "B+": "#f59e0b", "B": "#f97316", "C": "#ef4444",
};

interface BuyerMatch {
  buyer: { id: string; name: string; price_band: string; eco_preference: number };
  score: number;
  reason: string;
}

interface MyListing {
  id: string;
  product_name: string;
  category: string;
  mrp: number;
  asking_price: number;
  grade: string;
  decision: string;
  circularity_score: number;
  green_credits: number;
  status: "active" | "sold" | "donated" | "recycled";
  image: string;
  listed_on: string;
}

const PRESEED: MyListing[] = [
  {
    id: "r004",
    product_name: "Bombay Dyeing Double Bedsheet Set",
    category: "home",
    mrp: 1499,
    asking_price: 1124,
    grade: "A",
    decision: "resell",
    circularity_score: 78,
    green_credits: 56,
    status: "sold",
    image: `${CDN}/furniture/annibale-colombo-bed/thumbnail.webp`,
    listed_on: "6 Jun 2026",
  },
  {
    id: "r006",
    product_name: "Nike Air Max 270 Sneakers",
    category: "apparel",
    mrp: 12995,
    asking_price: 9747,
    grade: "A",
    decision: "resell",
    circularity_score: 82,
    green_credits: 143,
    status: "sold",
    image: `${CDN}/mens-shoes/nike-air-jordan-1-red-and-black/thumbnail.webp`,
    listed_on: "11 Jun 2026",
  },
];

const STATUS_CONFIG = {
  active:   { label: "Listed · Active",   color: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.2)" },
  sold:     { label: "Sold ✓",            color: "#3b82f6", bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.2)" },
  donated:  { label: "Donated ✓",         color: "#8b5cf6", bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.2)" },
  recycled: { label: "Recycled ✓",        color: "#14b8a6", bg: "rgba(20,184,166,0.08)", border: "rgba(20,184,166,0.2)" },
};

function ListingCard({ listing, fullListing, onViewPassport }: { listing: MyListing; fullListing?: MarketplaceListing; onViewPassport?: () => void }) {
  const [matches, setMatches] = useState<BuyerMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [notified, setNotified] = useState<string | null>(null);

  const statusCfg = STATUS_CONFIG[listing.status];
  const gradeColor = GRADE_COLOR[listing.grade] ?? "#f59e0b";
  const discount = Math.round((1 - listing.asking_price / listing.mrp) * 100);
  const isDone = listing.status !== "active";

  useEffect(() => {
    if (listing.status === "active") {
      setLoadingMatches(true);
      const q = new URLSearchParams({
        category: listing.category,
        grade: listing.grade,
        mrp: String(listing.mrp),
        asking_price: String(listing.asking_price),
        circularity_score: String(listing.circularity_score),
        decision: listing.decision,
        name: listing.product_name,
      });
      fetch(`/api/match/${listing.id}?${q}`)
        .then((r) => r.json())
        .then((d) => setMatches(d.matches ?? []))
        .catch(() => setMatches([]))
        .finally(() => setLoadingMatches(false));
    }
  }, [listing.id, listing.status]);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#111113", border: "1px solid #27272a", opacity: isDone ? 0.75 : 1 }}>
      <div className="flex gap-4 p-4">
        {/* Image */}
        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0" style={{ background: "#18181b" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={listing.image} alt={listing.product_name} className="w-full h-full object-cover" style={{ filter: isDone ? "grayscale(40%)" : "none" }} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm leading-snug" style={{ color: "#fafafa", fontFamily: "Figtree, sans-serif" }}>{listing.product_name}</p>
            <span className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-lg" style={{ background: statusCfg.bg, border: `1px solid ${statusCfg.border}`, color: statusCfg.color, fontFamily: "Figtree, sans-serif" }}>
              {statusCfg.label}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: `${gradeColor}18`, border: `1px solid ${gradeColor}40`, color: gradeColor, fontFamily: "Figtree, sans-serif" }}>
              Grade {listing.grade}
            </span>
            <span className="text-xs" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>
              ₹{listing.asking_price.toLocaleString("en-IN")} · -{discount}% off MRP
            </span>
          </div>

          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs font-semibold" style={{ color: "#10b981", fontFamily: "Figtree, sans-serif" }}>
              ♻ {listing.circularity_score}/100
            </span>
            <span className="text-xs font-semibold" style={{ color: "#10b981", fontFamily: "Figtree, sans-serif" }}>
              🌿 +{listing.green_credits} credits
            </span>
            <span className="text-xs" style={{ color: "#3f3f46", fontFamily: "Figtree, sans-serif" }}>
              Listed {listing.listed_on}
            </span>
          </div>
        </div>
      </div>

      {/* Health card button */}
      {fullListing && onViewPassport && (
        <div className="px-4 pb-3" style={{ borderTop: "1px solid #1c1c1e" }}>
          <button
            onClick={onViewPassport}
            className="w-full mt-3 text-xs font-semibold py-2 rounded-xl transition-all hover:opacity-80"
            style={{ background: "#18181b", border: "1px solid #3f3f46", color: "#a1a1aa", fontFamily: "Figtree, sans-serif" }}
          >
            View Health Card →
          </button>
        </div>
      )}

      {/* Active: buyer matches — always visible */}
      {listing.status === "active" && (
        <div style={{ borderTop: "1px solid #1c1c1e" }}>
          <div className="px-4 pt-3 pb-1">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>
              Next Best Owners · Notify to sell faster
            </p>
          </div>
          <div className="px-4 pb-4 space-y-2 mt-2">
            {loadingMatches ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 rounded-xl" style={{ background: "#18181b", animation: "pulse 1.5s ease-in-out infinite" }} />)}</div>
            ) : matches.length === 0 ? (
              <p className="text-xs text-center py-3" style={{ color: "#52525b" }}>Finding best matches…</p>
            ) : matches.map((m, i) => (
              <div key={m.buyer.id} className="flex items-center justify-between rounded-xl p-3"
                style={{ background: i === 0 ? "rgba(16,185,129,0.06)" : "#18181b", border: i === 0 ? "1px solid rgba(16,185,129,0.2)" : "1px solid #27272a" }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: i === 0 ? "rgba(16,185,129,0.15)" : "#27272a", color: i === 0 ? "#10b981" : "#52525b", fontFamily: "Syne, sans-serif" }}>
                    {m.buyer.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#fafafa", fontFamily: "Figtree, sans-serif" }}>{m.buyer.name}</p>
                    <p className="text-xs" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>{m.reason}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    {i === 0 && <p className="text-xs font-semibold" style={{ color: "#10b981", fontFamily: "Figtree, sans-serif" }}>Best match</p>}
                    <p className="font-bold text-sm" style={{ color: i === 0 ? "#10b981" : "#52525b", fontFamily: "Syne, sans-serif" }}>{m.score}pts</p>
                  </div>
                  {notified === m.buyer.id ? (
                    <span className="text-xs font-semibold px-2.5 py-1.5 rounded-lg" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", fontFamily: "Figtree, sans-serif" }}>
                      ✓ Notified
                    </span>
                  ) : (
                    <button onClick={() => setNotified(m.buyer.id)}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all hover:opacity-80"
                      style={{ background: "#18181b", border: "1px solid #3f3f46", color: "#a1a1aa", fontFamily: "Figtree, sans-serif" }}>
                      Notify →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Done: sold/donated/recycled summary */}
      {isDone && (
        <div className="px-4 pb-4">
          <div className="rounded-xl px-3 py-2 text-xs font-semibold text-center" style={{ background: statusCfg.bg, border: `1px solid ${statusCfg.border}`, color: statusCfg.color, fontFamily: "Figtree, sans-serif" }}>
            {listing.status === "sold" ? `Sold for ₹${listing.asking_price.toLocaleString("en-IN")} · ${listing.green_credits} green credits earned` :
             listing.status === "donated" ? `Donated · ${listing.green_credits} green credits earned` :
             `Recycled · ${listing.green_credits} green credits earned`}
          </div>
        </div>
      )}
    </div>
  );
}

function loadStorageListings(): MyListing[] {
  try {
    const raw = localStorage.getItem("reloop_my_listings");
    if (!raw) return [];
    const arr = JSON.parse(raw) as Array<{
      id: string; product_id: string; product_name: string; category: string;
      mrp: number; asking_price: number; grade: { grade: string }; decision: string;
      circularity_score: number; green_credits: number; image: string; listed_at: string;
    }>;
    return arr.map(l => ({
      id: l.id,
      product_name: l.product_name,
      category: l.category,
      mrp: l.mrp,
      asking_price: l.asking_price,
      grade: l.grade?.grade ?? "B",
      decision: l.decision,
      circularity_score: l.circularity_score ?? 60,
      green_credits: l.green_credits ?? 50,
      status: "active" as const,
      image: l.image,
      listed_on: new Date(l.listed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    }));
  } catch { return []; }
}

function storageToFullListing(raw: {
  id: string; product_id: string; product_name: string; category: string;
  mrp: number; asking_price: number; grade: import("@/types").GradeResult;
  decision: string; listed_at: string; image: string; circularity_score: number;
  co2_saved_kg: number; expected_lifespan_years: number; warranty_months: number;
  inspection_images?: string[];
}): MarketplaceListing {
  return {
    id: raw.id,
    product_id: raw.product_id,
    product_name: raw.product_name,
    category: raw.category,
    mrp: raw.mrp,
    asking_price: raw.asking_price,
    grade: raw.grade,
    decision: raw.decision,
    listed_at: raw.listed_at,
    image: raw.image,
    circularity_score: raw.circularity_score,
    co2_saved_kg: raw.co2_saved_kg,
    expected_lifespan_years: raw.expected_lifespan_years,
    warranty_months: raw.warranty_months,
    inspection_images: raw.inspection_images,
  };
}

export default function MyListingsPage() {
  const [marketplaceListings, setMarketplaceListings] = useState<MarketplaceListing[]>([]);
  const [passportListing, setPassportListing] = useState<MarketplaceListing | null>(null);
  const [storageListings, setStorageListings] = useState<MyListing[]>([]);
  const [storageFullListings, setStorageFullListings] = useState<MarketplaceListing[]>([]);

  function syncStorage() {
    const listings = loadStorageListings();
    setStorageListings(listings);
    try {
      const raw = JSON.parse(localStorage.getItem("reloop_my_listings") ?? "[]");
      setStorageFullListings(raw.map(storageToFullListing));
    } catch {}
  }

  useEffect(() => {
    fetch("/api/marketplace").then(r => r.json()).then(setMarketplaceListings).catch(() => {});
    syncStorage();
    window.addEventListener("storage", syncStorage);
    return () => window.removeEventListener("storage", syncStorage);
  }, []);

  const allActive = [...storageListings, ...PRESEED.filter(l => l.status === "active")];
  const done = PRESEED.filter(l => l.status !== "active");
  const totalCount = allActive.length + done.length;

  function getFullListing(listing: MyListing): MarketplaceListing | undefined {
    // Check user-uploaded (storage) listings first
    const fromStorage = storageFullListings.find(m => m.id === listing.id);
    if (fromStorage) return fromStorage;
    // Fall back to marketplace API listings (pre-seeds)
    return marketplaceListings.find(m => m.id === listing.id);
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <div className="flex items-center gap-3 mb-8 animate-fade-up">
        <Link href="/account" className="text-sm" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>← Account</Link>
        <span style={{ color: "#27272a" }}>|</span>
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>My Listings</h1>
          <p className="text-xs mt-0.5" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>Items you returned — AI graded, listed, matched to buyers</p>
        </div>
      </div>

      {allActive.length > 0 && (
        <div className="mb-8 animate-fade-up">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>Active · {allActive.length}</p>
          <div className="space-y-3">
            {allActive.map(l => {
              const full = getFullListing(l);
              return <ListingCard key={l.id} listing={l} fullListing={full} onViewPassport={full ? () => setPassportListing(full) : undefined} />;
            })}
          </div>
        </div>
      )}

      {done.length > 0 && (
        <div className="animate-fade-up delay-1">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>Completed · {done.length}</p>
          <div className="space-y-3">
            {done.map(l => {
              const full = getFullListing(l);
              return <ListingCard key={l.id} listing={l} fullListing={full} onViewPassport={full ? () => setPassportListing(full) : undefined} />;
            })}
          </div>
        </div>
      )}

      {passportListing && (
        <PassportModal listing={passportListing} onClose={() => setPassportListing(null)} hideBuyButton />
      )}

      {totalCount === 0 && (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">📦</p>
          <p className="font-semibold" style={{ color: "#fafafa", fontFamily: "Figtree, sans-serif" }}>No listings yet</p>
          <p className="text-sm mt-1" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>Return an item to see it listed here</p>
          <Link href="/account" className="inline-block mt-4 text-sm font-semibold" style={{ color: "#10b981", fontFamily: "Figtree, sans-serif" }}>Start a return →</Link>
        </div>
      )}
    </div>
  );
}
