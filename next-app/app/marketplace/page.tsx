"use client";
import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MarketplaceListing, Buyer } from "@/types";
import { PersonalizedListing, personalizeForBuyer } from "@/lib/buyer-match";
import { applyDynamicPricing } from "@/lib/dynamic-pricing";
import PassportModal from "@/components/PassportModal";
import StarRating from "@/components/StarRating";
import { ratingFor, reviewCountFor, formatCount } from "@/lib/ratings";
import {
  ChevronRight, Leaf, ShieldCheck, Truck, TrendingDown, TrendingUp,
  BadgeCheck, SlidersHorizontal,
} from "lucide-react";

// ---- Amazon-style palette ----
const C = {
  page: "#EAEDED",
  card: "#FFFFFF",
  border: "#D5D9D9",
  borderDark: "#888C8C",
  ink: "#0F1111",
  ink2: "#565959",
  link: "#007185",
  linkHover: "#C7511F",
  deal: "#CC0C39",
  star: "#FFA41C",
  ctaYellow: "#FFD814",
  ctaYellowBorder: "#FCD200",
  green: "#067D62",
  greenBg: "#E7F5F1",
};

const CONDITION: Record<string, { label: string; color: string; bg: string }> = {
  "A":  { label: "Open Box · Like New",       color: "#067D62", bg: "#E7F5F1" },
  "A-": { label: "Open Box · Minor Cosmetic",  color: "#067D62", bg: "#E7F5F1" },
  "B+": { label: "Refurbished · Moderate Wear", color: "#8A6D00", bg: "#FEF6E0" },
  "B":  { label: "Refurbished · Heavy Wear",   color: "#B45309", bg: "#FDEEDC" },
  "C":  { label: "Used · Acceptable",          color: "#B12704", bg: "#FDECEC" },
};

function matchTone(percent: number): { color: string; bg: string; label: string } {
  if (percent >= 75) return { color: "#067D62", bg: "#E7F5F1", label: "Great match" };
  if (percent >= 55) return { color: "#067D62", bg: "#E7F5F1", label: "Good match" };
  if (percent >= 35) return { color: "#8A6D00", bg: "#FEF6E0", label: "Worth a look" };
  return { color: "#565959", bg: "#F0F2F2", label: "Browse" };
}

type FilterKey = "All" | "Electronics" | "Apparel" | "Home" | "Grade A" | "Grade A-";
const CATEGORY_FILTERS: FilterKey[] = ["All", "Electronics", "Apparel", "Home"];
const CONDITION_FILTERS: FilterKey[] = ["Grade A", "Grade A-"];

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

function isPersonalized(l: MarketplaceListing): l is PersonalizedListing {
  return (l as PersonalizedListing).match_percent != null;
}

// Free-text search: every whitespace-separated term must appear in the
// product name or category (case-insensitive). Empty query matches everything.
function matchesQuery(listing: MarketplaceListing, query: string): boolean {
  if (!query) return true;
  const haystack = `${listing.product_name} ${listing.category.replace(/_/g, " ")}`.toLowerCase();
  return query.toLowerCase().split(/\s+/).every((term) => haystack.includes(term));
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={null}>
      <MarketplaceInner />
    </Suspense>
  );
}

function MarketplaceInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = (searchParams.get("q") ?? "").trim();

  const [apiListings, setApiListings] = useState<MarketplaceListing[]>([]);
  const [userListings, setUserListings] = useState<MarketplaceListing[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [activeBuyerId, setActiveBuyerId] = useState<string>("");
  const [selected, setSelected] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("All");

  useEffect(() => {
    fetch("/api/buyers").then((r) => r.json()).then(setBuyers).catch(() => setBuyers([]));
  }, []);

  // Load the current user's own listings from localStorage (kept in sync).
  useEffect(() => {
    function load() {
      try {
        const raw = JSON.parse(localStorage.getItem("reloop_my_listings") ?? "[]") as MarketplaceListing[];
        setUserListings(raw.filter((l) => ["resell", "refurbish"].includes(l.decision)));
      } catch { setUserListings([]); }
    }
    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, []);

  // Fetch the shared (seed) marketplace listings — scored for the active buyer.
  useEffect(() => {
    setLoading(true);
    const url = activeBuyerId ? `/api/personalized?buyerId=${activeBuyerId}` : "/api/personalized";
    fetch(url)
      .then((r) => r.json())
      .then((d) => setApiListings(d.listings ?? []))
      .catch(() => setApiListings([]))
      .finally(() => setLoading(false));
  }, [activeBuyerId]);

  // Compose what THIS viewer sees:
  //  • Guest (no persona) = the seller's own view → hide the seller's own items
  //    (you can't buy your own listing).
  //  • Viewing "as" a buyer persona = another customer → the seller's items ARE
  //    visible to them, priced + match-scored for that buyer, replacing the
  //    generic seed copy of the same product.
  const listings = useMemo<MarketplaceListing[]>(() => {
    const ownProductIds = new Set(userListings.map((l) => l.product_id));
    const base = apiListings.filter((l) => !ownProductIds.has(l.product_id));

    if (!activeBuyerId) {
      // Default view: show own listings first (with "Your Listing" badge in card), then rest
      return [...userListings, ...base];
    }
    const buyer = buyers.find((b) => b.id === activeBuyerId);
    if (!buyer || userListings.length === 0) return apiListings;
    const scoredOwn = personalizeForBuyer(buyer, applyDynamicPricing(userListings, buyers));
    return [...scoredOwn, ...base].sort(
      (a, b) => ((b as PersonalizedListing).match_score ?? 0) - ((a as PersonalizedListing).match_score ?? 0)
    );
  }, [apiListings, userListings, activeBuyerId, buyers]);

  const activeBuyer = buyers.find((b) => b.id === activeBuyerId) ?? null;
  const filtered = applyFilter(listings, activeFilter).filter((l) => matchesQuery(l, query));
  const personalized = activeBuyer != null;

  return (
    <div style={{ background: C.page, minHeight: "100%" }}>
      <div className="max-w-7xl mx-auto px-4 py-4" style={{ fontFamily: "Figtree, sans-serif" }}>
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-xs mb-3" style={{ color: C.ink2 }}>
          <span>ReLoop</span>
          <ChevronRight size={12} />
          <span>Second Life Marketplace</span>
          <ChevronRight size={12} />
          <span style={{ color: C.deal }}>Certified Open-Box &amp; Refurbished</span>
        </div>

        {/* Results header bar */}
        <div className="rounded-lg px-4 py-2.5 mb-3 flex items-center justify-between gap-4 flex-wrap"
             style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="text-sm" style={{ color: C.ink }}>
            <span className="font-bold">{loading ? "…" : filtered.length}</span> results
            {query ? (
              <> for <span className="font-bold" style={{ color: C.deal }}>&ldquo;{query}&rdquo;</span></>
            ) : (
              <> for <span className="font-bold" style={{ color: C.deal }}>AI-Certified Second Life products</span></>
            )}
            {query && (
              <button onClick={() => router.push("/marketplace")} className="ml-2 underline" style={{ color: C.link }}>
                clear
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium" style={{ color: C.ink2 }}>Personalize for</label>
            <select
              value={activeBuyerId}
              onChange={(e) => setActiveBuyerId(e.target.value)}
              className="px-2.5 py-1.5 rounded-md text-sm outline-none cursor-pointer"
              style={{ background: "#F0F2F2", border: `1px solid ${C.borderDark}`, color: C.ink, minWidth: 200 }}
            >
              <option value="">Guest (no personalization)</option>
              {buyers.map((b) => (
                <option key={b.id} value={b.id}>{b.name} · {b.price_band}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-4 items-start">
          {/* ---- Left filter rail ---- */}
          <aside className="hidden lg:block w-56 flex-shrink-0 rounded-lg px-4 py-4"
                 style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-1.5 mb-3 font-bold text-sm" style={{ color: C.ink }}>
              <SlidersHorizontal size={15} /> Filters
            </div>

            <FilterSection title="Department">
              {CATEGORY_FILTERS.map((f) => (
                <FilterRow key={f} label={f === "All" ? "All Departments" : f}
                  active={activeFilter === f} onClick={() => setActiveFilter(f)} />
              ))}
            </FilterSection>

            <FilterSection title="Condition">
              {CONDITION_FILTERS.map((f) => (
                <FilterRow key={f} label={f.replace("Grade ", "Grade ")}
                  active={activeFilter === f} onClick={() => setActiveFilter(f)} />
              ))}
            </FilterSection>

            <FilterSection title="Sustainability">
              <div className="flex items-center gap-2 py-1 text-sm" style={{ color: C.green }}>
                <Leaf size={15} /> <span>Second Life Certified</span>
              </div>
              <p className="text-xs mt-1" style={{ color: C.ink2 }}>
                Every item is AI-graded and counted toward e-waste diverted.
              </p>
            </FilterSection>
          </aside>

          {/* ---- Results grid ---- */}
          <div className="flex-1 min-w-0">
            {/* Recommended strip (personalized) */}
            {personalized && activeBuyer && (
              <div className="rounded-lg px-4 py-3 mb-3 flex items-center gap-2 text-sm"
                   style={{ background: C.greenBg, border: `1px solid ${C.green}33`, color: C.ink }}>
                <BadgeCheck size={16} style={{ color: C.green }} />
                <span>
                  Personalized for <b>{activeBuyer.name}</b> · interested in{" "}
                  <b style={{ color: C.green }}>{activeBuyer.category_affinity.join(", ")}</b> · accepts{" "}
                  <b style={{ color: C.green }}>{activeBuyer.grade_tolerance.join(", ")}</b>
                </span>
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-80 rounded-lg" style={{ background: "#F7F8F8", border: `1px solid ${C.border}` }} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 rounded-lg" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                <p className="font-bold text-lg" style={{ color: C.ink }}>
                  {query ? `No matches for “${query}”` : "No results"}
                </p>
                <button
                  onClick={() => { setActiveFilter("All"); if (query) router.push("/marketplace"); }}
                  className="text-sm mt-2 underline"
                  style={{ color: C.link }}
                >
                  {query ? "Clear search & filters" : "Clear filters"}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {filtered.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} onSelect={() => setSelected(listing)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selected && <PassportModal listing={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

/* ---------- subcomponents ---------- */

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 pb-3" style={{ borderBottom: "1px solid #E3E6E6" }}>
      <p className="font-bold text-sm mb-1.5" style={{ color: "#0F1111" }}>{title}</p>
      {children}
    </div>
  );
}

function FilterRow({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="block w-full text-left py-1 text-sm transition-colors"
      style={{ color: active ? "#C7511F" : "#007185", fontWeight: active ? 700 : 400 }}>
      {label}
    </button>
  );
}

function ListingCard({ listing, onSelect }: { listing: MarketplaceListing; onSelect: () => void }) {
  const cond = CONDITION[listing.grade.grade] ?? CONDITION["B+"];
  const livePrice = listing.dynamic_price ?? listing.asking_price;
  const basePrice = listing.base_price ?? listing.asking_price;
  const discount = Math.round((1 - livePrice / listing.mrp) * 100);
  const rating = ratingFor(listing.id, listing.grade.grade);
  const reviews = reviewCountFor(listing.id, listing.grade.grade);
  const pers = isPersonalized(listing) ? listing : null;
  const tone = pers ? matchTone(pers.match_percent) : null;

  const trend = listing.price_trend;
  const deltaPct = Math.round(((livePrice - basePrice) / basePrice) * 100);

  return (
    <div
      onClick={onSelect}
      className="rounded-lg overflow-hidden cursor-pointer transition-shadow flex flex-col"
      style={{ background: C.card, border: `1px solid ${C.border}` }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(15,17,17,0.15)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
    >
      {/* Image */}
      <div className="relative aspect-square flex items-center justify-center" style={{ background: "#fff", padding: 14 }}>
        {pers && tone && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-xs font-bold z-10"
               style={{ background: tone.bg, color: tone.color }}>
            {pers.match_percent}% match
          </div>
        )}
        {listing.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.image} alt={listing.product_name} className="max-w-full max-h-full object-contain mix-blend-multiply" />
        ) : (
          <div style={{ color: C.ink2 }}>No image</div>
        )}
      </div>

      <div className="px-3 pb-3 flex flex-col gap-1.5 flex-1">
        {/* Condition badge */}
        <span className="inline-flex items-center gap-1 self-start px-1.5 py-0.5 rounded text-xs font-bold"
              style={{ background: cond.bg, color: cond.color }}>
          <ShieldCheck size={11} /> {cond.label}
        </span>

        {/* Title */}
        <p className="text-sm leading-snug line-clamp-2 hover:underline" style={{ color: C.link }}>
          {listing.product_name}
        </p>

        {/* Rating */}
        <div className="flex items-center gap-1.5">
          <StarRating rating={rating} size={13} />
          <span className="text-xs hover:underline" style={{ color: C.link }}>{formatCount(reviews)}</span>
        </div>

        {/* Personalized reason */}
        {pers?.match_reason && (
          <p className="text-xs line-clamp-1" style={{ color: cond.color }}>{pers.match_reason}</p>
        )}

        {/* Price block */}
        <div className="flex items-baseline gap-1.5 mt-0.5">
          {discount > 0 && <span className="text-base font-medium" style={{ color: C.deal }}>-{discount}%</span>}
          <span className="text-xl font-bold" style={{ color: C.ink }}>
            <span className="text-xs align-top">₹</span>{livePrice.toLocaleString("en-IN")}
          </span>
        </div>
        <div className="text-xs" style={{ color: C.ink2 }}>
          M.R.P.: <span className="line-through">₹{listing.mrp.toLocaleString("en-IN")}</span>
        </div>

        {/* Dynamic pricing pill */}
        {trend && trend !== "stable" && (
          <div className="inline-flex items-center gap-1 text-xs font-semibold mt-0.5"
               style={{ color: trend === "down" ? C.green : "#B45309" }}>
            {trend === "down" ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
            {trend === "down"
              ? `Price dropped ${Math.abs(deltaPct)}% · low demand`
              : `Price up ${deltaPct}% · high demand`}
          </div>
        )}

        {/* Sustainability + delivery */}
        <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: C.green }}>
          <Leaf size={12} /> Saves {listing.co2_saved_kg}kg CO₂ · Second Life Certified
        </div>
        <div className="flex items-center gap-1 text-xs" style={{ color: C.ink2 }}>
          <Truck size={12} /> FREE delivery · {listing.warranty_months}mo warranty
        </div>

        {/* CTA */}
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          className="mt-2 w-full py-1.5 rounded-full text-sm font-medium transition-colors"
          style={{ background: C.ctaYellow, border: `1px solid ${C.ctaYellowBorder}`, color: C.ink }}
        >
          See condition &amp; buy
        </button>
      </div>
    </div>
  );
}
