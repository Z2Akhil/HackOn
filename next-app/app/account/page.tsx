"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import ReturnModal, { DEMO_ORDERS } from "@/components/ReturnModal";
import { AZ } from "@/lib/ui-theme";
import { Leaf, MapPin, Recycle, RotateCcw } from "lucide-react";

const CDN = "https://cdn.dummyjson.com/product-images";

const ORDERS = [
  { id: "o006", product_name: "boAt Airdopes 141 TWS Earbuds",     category: "electronics",     mrp: 1299,  ordered: "12 Jun 2026", status: "Delivered",        returnable: true,  image: `${CDN}/mobile-accessories/apple-airpods/thumbnail.webp` },
  { id: "o002", product_name: "Sony WH-1000XM5 Headphones",       category: "electronics",     mrp: 29990, ordered: "22 May 2026", status: "Delivered",        returnable: true,  image: `${CDN}/mobile-accessories/apple-airpods-max-silver/thumbnail.webp` },
  { id: "o003", product_name: "Levis 511 Slim Fit Jeans",          category: "apparel",         mrp: 4999,  ordered: "1 Jun 2026",  status: "Delivered",        returnable: true,  image: `${CDN}/mens-shirts/blue-&-black-check-shirt/thumbnail.webp` },
  { id: "o001", product_name: "Bajaj Mixer Grinder 750W",         category: "home_appliances",  mrp: 3499,  ordered: "18 May 2026", status: "Delivered",        returnable: true,  image: `${CDN}/kitchen-accessories/boxed-blender/thumbnail.webp` },
  { id: "o004", product_name: "Bombay Dyeing Double Bedsheet Set", category: "home",            mrp: 1499,  ordered: "5 Jun 2026",  status: "Sold via ReLoop", returnable: false, image: `${CDN}/furniture/annibale-colombo-bed/thumbnail.webp` },
  { id: "o005", product_name: "Nike Air Max 270 Sneakers (M)",     category: "apparel",         mrp: 12995, ordered: "10 Jun 2026", status: "Sold via ReLoop", returnable: false, image: `${CDN}/mens-shoes/nike-air-jordan-1-red-and-black/thumbnail.webp` },
];

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  "Delivered":        { color: AZ.green, bg: AZ.greenBg, border: `${AZ.green}33` },
  "Return Requested": { color: AZ.amber, bg: AZ.amberBg, border: `${AZ.amber}33` },
  "In Transit":       { color: AZ.blue,  bg: "#E8F0F7",  border: `${AZ.blue}33` },
  "Sold via ReLoop":  { color: AZ.blue,  bg: "#E8F0F7",  border: `${AZ.blue}33` },
};

const DEFAULT_PROFILE = {
  name: "User",
  email: "",
  phone: "",
  location: "",
  eco_preference: "Medium",
  member_since: "2026",
};

type Profile = typeof DEFAULT_PROFILE;

// Credits from pre-seeded listings (Bombay Dyeing + Nike)
const PRESEED_CREDITS = 56 + 143;

function computeTotalCredits(): number {
  try {
    const raw = JSON.parse(localStorage.getItem("reloop_my_listings") ?? "[]") as Array<{ green_credits?: number }>;
    const fromStorage = raw.reduce((sum, l) => sum + (l.green_credits ?? 0), 0);
    return PRESEED_CREDITS + fromStorage;
  } catch { return PRESEED_CREDITS; }
}

export default function AccountPage() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Profile>(DEFAULT_PROFILE);
  const [saved, setSaved] = useState(false);
  const [returningOrder, setReturningOrder] = useState<typeof DEMO_ORDERS[0] | null>(null);
  const [totalCredits, setTotalCredits] = useState(PRESEED_CREDITS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("reloop_profile");
      if (stored) { const p = JSON.parse(stored); setProfile(p); setDraft(p); }
    } catch {}
    setTotalCredits(computeTotalCredits());

    function onStorage() { setTotalCredits(computeTotalCredits()); }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function openEdit() { setDraft({ ...profile }); setEditing(true); setSaved(false); }

  function saveEdit() {
    setProfile({ ...draft });
    try {
      localStorage.setItem("reloop_profile", JSON.stringify(draft));
      window.dispatchEvent(new Event("storage"));
    } catch {}
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const initials = profile.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div style={{ background: AZ.page, minHeight: "100%" }}>
      <div className="max-w-2xl mx-auto px-5 py-10">

        {/* Profile header */}
        <div className="rounded-2xl p-6 mb-6 animate-fade-up" style={{ background: AZ.card, border: `1px solid ${AZ.border}` }}>
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#067D62,#04573F)", color: "#fff", fontFamily: "Syne, sans-serif" }}
            >
              {initials}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold truncate" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>
                {profile.name}
              </h1>
              <p className="text-sm mt-0.5" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
                {profile.email} · Member since {profile.member_since}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-semibold" style={{ background: AZ.greenBg, border: `1px solid ${AZ.green}33`, color: AZ.green, fontFamily: "Figtree, sans-serif" }}>
                  <Leaf size={12} /> {totalCredits} Green Credits
                </span>
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-semibold" style={{ background: AZ.surfaceAlt, border: `1px solid ${AZ.border}`, color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
                  <MapPin size={12} /> {profile.location}
                </span>
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-semibold" style={{ background: AZ.surfaceAlt, border: `1px solid ${AZ.border}`, color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
                  <Recycle size={12} /> Eco: {profile.eco_preference}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 flex-shrink-0">
              <Link
                href="/my-listings"
                className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-90 text-center"
                style={{ background: AZ.ctaYellow, border: `1px solid ${AZ.ctaYellowBorder}`, color: AZ.ink, fontFamily: "Figtree, sans-serif" }}
              >
                My Listings →
              </Link>
              <button
                onClick={openEdit}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-80"
                style={{ background: AZ.surfaceAlt, color: AZ.ink2, border: `1px solid ${AZ.border}`, fontFamily: "Figtree, sans-serif" }}
              >
                Edit Profile
              </button>
            </div>
          </div>

          {saved && (
            <p className="text-xs mt-3 font-semibold" style={{ color: AZ.green, fontFamily: "Figtree, sans-serif" }}>
              ✓ Profile updated
            </p>
          )}
        </div>

        {/* Edit panel */}
        {editing && (
          <div className="rounded-2xl p-6 mb-6 animate-fade-up" style={{ background: AZ.card, border: `1px solid ${AZ.green}66` }}>
            <h2 className="font-bold mb-4" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>Edit Profile</h2>

            <div className="space-y-3">
              {(
                [
                  { key: "name",     label: "Full Name",     type: "text" },
                  { key: "email",    label: "Email",         type: "email" },
                  { key: "phone",    label: "Phone",         type: "tel" },
                  { key: "location", label: "Location",      type: "text" },
                ] as { key: keyof Profile; label: string; type: string }[]
              ).map(({ key, label, type }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold mb-1" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
                    {label}
                  </label>
                  <input
                    type={type}
                    value={draft[key]}
                    onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
                    style={{
                      background: AZ.surfaceAlt, border: `1px solid ${AZ.border}`,
                      color: AZ.ink, fontFamily: "Figtree, sans-serif",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = AZ.green)}
                    onBlur={(e) => (e.target.style.borderColor = AZ.border)}
                  />
                </div>
              ))}

              {/* Eco preference select */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
                  Eco Preference
                </label>
                <div className="flex gap-2">
                  {["Low", "Medium", "High"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setDraft((d) => ({ ...d, eco_preference: opt }))}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                      style={{
                        background: draft.eco_preference === opt ? AZ.greenBg : AZ.surfaceAlt,
                        border: draft.eco_preference === opt ? `1px solid ${AZ.green}66` : `1px solid ${AZ.border}`,
                        color: draft.eco_preference === opt ? AZ.green : AZ.ink2,
                        fontFamily: "Figtree, sans-serif",
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={saveEdit}
                className="flex-1 font-semibold py-2.5 rounded-xl transition-all hover:opacity-90"
                style={{ background: AZ.ctaYellow, border: `1px solid ${AZ.ctaYellowBorder}`, color: AZ.ink, fontFamily: "Figtree, sans-serif" }}
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                style={{ background: AZ.surfaceAlt, color: AZ.ink2, border: `1px solid ${AZ.border}`, fontFamily: "Figtree, sans-serif" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Orders section */}
        <div className="flex items-center justify-between mb-4 animate-fade-up delay-1">
          <h2 className="text-lg font-bold" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>My Orders</h2>
          <span className="text-xs" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>{ORDERS.length} orders</span>
        </div>

        <div className="space-y-3 animate-fade-up delay-1">
          {ORDERS.map((order) => {
            const statusStyle = STATUS_STYLE[order.status] ?? STATUS_STYLE["In Transit"];
            return (
              <div
                key={order.id}
                className="rounded-xl p-4 flex items-center gap-4"
                style={{ background: AZ.card, border: `1px solid ${AZ.border}` }}
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0" style={{ background: AZ.surfaceAlt }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={order.image} alt={order.product_name} className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: AZ.ink, fontFamily: "Figtree, sans-serif" }}>
                    {order.product_name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
                    ₹{order.mrp.toLocaleString("en-IN")} · {order.ordered}
                  </p>
                  <span
                    className="inline-block mt-1.5 text-xs font-semibold px-2 py-0.5 rounded-md"
                    style={{ background: statusStyle.bg, border: `1px solid ${statusStyle.border}`, color: statusStyle.color, fontFamily: "Figtree, sans-serif" }}
                  >
                    {order.status}
                  </span>
                </div>

                {order.returnable ? (
                  <button
                    onClick={() => setReturningOrder(DEMO_ORDERS.find(o => o.id === order.id) ?? null)}
                    className="flex-shrink-0 inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                    style={{ background: AZ.ctaYellow, border: `1px solid ${AZ.ctaYellowBorder}`, color: AZ.ink, fontFamily: "Figtree, sans-serif" }}
                  >
                    Return <RotateCcw size={14} />
                  </button>
                ) : (
                  <span className="flex-shrink-0 text-xs px-3 py-2 rounded-xl" style={{ background: AZ.surfaceAlt, color: AZ.ink2, border: `1px solid ${AZ.border}`, fontFamily: "Figtree, sans-serif" }}>
                    {order.status === "Return Requested" ? "Processing" : "Pending"}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center animate-fade-up">
          <Link href="/marketplace" className="text-sm font-semibold" style={{ color: AZ.link, fontFamily: "Figtree, sans-serif" }}>
            Browse AI-Certified Open-Box items →
          </Link>
        </div>

        {returningOrder && (
          <ReturnModal order={returningOrder} onClose={() => setReturningOrder(null)} />
        )}
      </div>
    </div>
  );
}
