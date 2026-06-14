"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MarketplaceListing } from "@/types";
import { getVideo } from "@/lib/video-store";
import { AZ, CONDITION } from "@/lib/ui-theme";
import { addToCart } from "@/lib/cart";
import { Search, Play, X } from "lucide-react";

const CDN = "https://cdn.dummyjson.com/product-images";

// Per-category secondary inspection photos (simulate multi-angle capture)
const CATEGORY_INSPECTION_PHOTOS: Record<string, string[]> = {
  electronics:    [`${CDN}/mobile-accessories/apple-airpods/thumbnail.webp`,    `${CDN}/tablets/ipad-mini-2021-starlight/thumbnail.webp`],
  home_appliances:[`${CDN}/kitchen-accessories/carbon-steel-wok/thumbnail.webp`, `${CDN}/kitchen-accessories/microwave-oven/thumbnail.webp`],
  apparel:        [`${CDN}/mens-shirts/man-short-sleeve-shirt/thumbnail.webp`,   `${CDN}/womens-shoes/pampi-shoes/thumbnail.webp`],
  home:           [`${CDN}/furniture/annibale-colombo-sofa/thumbnail.webp`,      `${CDN}/furniture/annibale-colombo-bed/thumbnail.webp`],
  accessories:    [`${CDN}/mens-watches/rolex-datejust/thumbnail.webp`,          `${CDN}/mens-watches/rolex-datejust/thumbnail.webp`],
  sports:         [`${CDN}/sports-accessories/tennis-racket/thumbnail.webp`,     `${CDN}/sports-accessories/tennis-racket/thumbnail.webp`],
  beauty:         [`${CDN}/skin-care/olay-ultra-moisture-shea-butter-body-wash/thumbnail.webp`, `${CDN}/skin-care/olay-ultra-moisture-shea-butter-body-wash/thumbnail.webp`],
};

function getInspectionPhotos(listing: MarketplaceListing): string[] {
  if (listing.inspection_images && listing.inspection_images.length > 0) {
    return listing.inspection_images.filter(Boolean).slice(0, 3);
  }
  const secondary = CATEGORY_INSPECTION_PHOTOS[listing.category] ?? [];
  return [listing.image, ...secondary].filter(Boolean).slice(0, 3);
}

// Fallback condition styling when a grade isn't in the shared CONDITION map.
const FALLBACK_CONDITION = { label: "Moderate Wear", short: "Moderate Wear", color: AZ.amber, bg: AZ.amberBg };

function CircularityBar({ score }: { score: number }) {
  const color = score >= 75 ? AZ.green : score >= 50 ? AZ.amber : AZ.red;
  const label = score >= 75 ? "High" : score >= 50 ? "Medium" : "Low";
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>Circularity Score</span>
        <span className="text-sm font-black" style={{ color, fontFamily: "Syne, sans-serif" }}>{score}/100 · {label}</span>
      </div>
      <div className="h-2 rounded-full" style={{ background: AZ.surfaceAlt }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  );
}

export default function PassportModal({ listing, onClose, hideBuyButton }: { listing: MarketplaceListing; onClose: () => void; hideBuyButton?: boolean }) {
  const router = useRouter();
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [userVideoUrl, setUserVideoUrl] = useState<string | null>(null);
  const cfg = CONDITION[listing.grade.grade] ?? FALLBACK_CONDITION;
  const livePrice = listing.dynamic_price ?? listing.asking_price;
  const discount = Math.round((1 - livePrice / listing.mrp) * 100);
  const inspectionPhotos = getInspectionPhotos(listing);

  function handleBuyNow() {
    addToCart({
      id: listing.id,
      name: listing.product_name,
      price: livePrice,
      mrp: listing.mrp,
      image: listing.image,
      condition: cfg.label,
    });
    onClose();
    router.push("/cart");
  }

  useEffect(() => {
    if (!hideBuyButton || !listing.id.startsWith("ul_")) return;
    getVideo(listing.id).then((file) => {
      if (file) setUserVideoUrl(URL.createObjectURL(file));
    }).catch(() => {});
    return () => { if (userVideoUrl) URL.revokeObjectURL(userVideoUrl); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing.id, hideBuyButton]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: "rgba(15,17,17,0.5)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl animate-fade-up"
        style={{ background: AZ.card, border: `1px solid ${AZ.border}`, boxShadow: "0 25px 80px rgba(15,17,17,0.25)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6" style={{ borderBottom: `1px solid ${AZ.border}` }}>
          <div className="flex items-start gap-4">
            {/* Product thumbnail */}
            <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center text-3xl" style={{ background: AZ.surfaceAlt, border: `1px solid ${AZ.border}` }}>
              {listing.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={listing.image} alt={listing.product_name} className="w-full h-full object-cover" />
              ) : "📦"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
                  AI Product Passport
                </div>
                <div className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: AZ.greenBg, color: AZ.green, border: `1px solid ${AZ.border}`, fontFamily: "Figtree, sans-serif" }}>
                  AI-Verified
                </div>
              </div>
              <h2 className="text-xl font-bold leading-tight" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>
                {listing.product_name}
              </h2>
              <p className="text-sm mt-0.5 capitalize" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
                {listing.category.replace(/_/g, " ")}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 hover:opacity-70"
              style={{ background: AZ.surfaceAlt, color: AZ.ink2, border: `1px solid ${AZ.border}` }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">

          {/* Photo gallery — seller view: only real inspection images; public: fallback to category photos */}
          {(hideBuyButton ? (listing.inspection_images && listing.inspection_images.length > 0) : inspectionPhotos.length > 0) && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
                {hideBuyButton ? "Your Inspection Photos" : "Inspection Photos · AI Captured"}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {inspectionPhotos.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setLightboxImg(src)}
                    className="relative aspect-square rounded-xl overflow-hidden group transition-all hover:ring-2"
                    style={{ background: AZ.surfaceAlt, border: `1px solid ${AZ.border}`, ringColor: AZ.green } as React.CSSProperties}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Inspection ${i + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(15,17,17,0.4)" }}>
                      <Search size={18} color="#fff" />
                    </div>
                    {i === 0 && (
                      <div className="absolute bottom-1 left-1 text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: AZ.green, color: "#fff", fontFamily: "Figtree, sans-serif" }}>
                        Main
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Seller view: show real video from IndexedDB if uploaded */}
          {hideBuyButton && userVideoUrl && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
                Your Inspection Video
              </p>
              <div className="relative rounded-xl overflow-hidden" style={{ background: AZ.surfaceAlt, border: `1px solid ${AZ.border}` }}>
                <video
                  className="w-full rounded-xl"
                  controls
                  src={userVideoUrl}
                  style={{ maxHeight: 220 }}
                />
                <div className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded font-semibold" style={{ background: AZ.green, color: "#fff", fontFamily: "Figtree, sans-serif" }}>
                  Uploaded
                </div>
              </div>
            </div>
          )}

          {/* Public marketplace view: demo video */}
          {!hideBuyButton && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
                360° Inspection Video
              </p>
              {videoPlaying ? (
                <div className="relative rounded-xl overflow-hidden" style={{ background: AZ.surfaceAlt, border: `1px solid ${AZ.border}` }}>
                  <video
                    className="w-full rounded-xl"
                    controls
                    autoPlay
                    style={{ maxHeight: 220 }}
                    onError={() => setVideoPlaying(false)}
                  >
                    <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
                  </video>
                  <div className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded font-semibold" style={{ background: AZ.green, color: "#fff", fontFamily: "Figtree, sans-serif" }}>
                    AI Recorded
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setVideoPlaying(true)}
                  className="relative w-full rounded-xl overflow-hidden group transition-all"
                  style={{ background: AZ.surfaceAlt, border: `1px solid ${AZ.border}` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={listing.image} alt="Video thumbnail" className="w-full object-cover" style={{ height: 160, filter: "brightness(0.7)" }} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform" style={{ background: AZ.green }}>
                      <Play size={20} color="#fff" fill="#fff" className="pl-0.5" />
                    </div>
                    <p className="text-xs font-semibold" style={{ color: AZ.ink, fontFamily: "Figtree, sans-serif" }}>Play Inspection Video</p>
                    <p className="text-xs" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>Recorded at return · 0:45</p>
                  </div>
                </button>
              )}
            </div>
          )}

          {/* Grade block */}
          <div className="rounded-xl p-4" style={{ background: cfg.bg, border: `1px solid ${AZ.border}` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl font-black" style={{ background: AZ.card, border: `2px solid ${cfg.color}`, color: cfg.color, fontFamily: "Syne, sans-serif" }}>
                  {listing.grade.grade}
                </div>
                <div>
                  <p className="font-bold text-lg" style={{ color: AZ.ink, fontFamily: "Syne, sans-serif" }}>{cfg.label}</p>
                  <p className="text-sm" style={{ color: cfg.color, fontFamily: "Figtree, sans-serif" }}>
                    {listing.grade.functional_risk} functional risk
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black" style={{ color: cfg.color, fontFamily: "Syne, sans-serif" }}>
                  {Math.round(listing.grade.confidence * 100)}%
                </p>
                <p className="text-xs" style={{ color: AZ.ink2 }}>AI confidence</p>
              </div>
            </div>
          </div>

          {/* Circularity score */}
          {listing.circularity_score != null && (
            <div className="rounded-xl p-4" style={{ background: AZ.surfaceAlt, border: `1px solid ${AZ.border}` }}>
              <CircularityBar score={listing.circularity_score} />
            </div>
          )}

          {/* Sustainability metrics row */}
          <div className="grid grid-cols-3 gap-2">
            {listing.co2_saved_kg != null && (
              <div className="rounded-xl p-3 text-center" style={{ background: AZ.greenBg, border: `1px solid ${AZ.border}` }}>
                <p className="text-base font-black" style={{ color: AZ.green, fontFamily: "Syne, sans-serif" }}>{listing.co2_saved_kg}kg</p>
                <p className="text-xs mt-0.5" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>CO₂ saved</p>
              </div>
            )}
            {listing.expected_lifespan_years != null && (
              <div className="rounded-xl p-3 text-center" style={{ background: AZ.surfaceAlt, border: `1px solid ${AZ.border}` }}>
                <p className="text-base font-black" style={{ color: AZ.ink, fontFamily: "Syne, sans-serif" }}>{listing.expected_lifespan_years}yr</p>
                <p className="text-xs mt-0.5" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>Est. lifespan</p>
              </div>
            )}
            {listing.warranty_months != null && (
              <div className="rounded-xl p-3 text-center" style={{ background: AZ.surfaceAlt, border: `1px solid ${AZ.border}` }}>
                <p className="text-base font-black" style={{ color: AZ.ink, fontFamily: "Syne, sans-serif" }}>{listing.warranty_months}mo</p>
                <p className="text-xs mt-0.5" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>Warranty</p>
              </div>
            )}
          </div>

          {/* Detail grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Packaging", value: listing.grade.packaging_status.replace(/_/g, " ") },
              { label: "Accessories", value: listing.grade.accessories_complete ? "✓ Complete" : "✗ Incomplete", color: listing.grade.accessories_complete ? AZ.green : AZ.red },
              { label: "Defects", value: listing.grade.defects.length === 0 ? "None detected" : `${listing.grade.defects.length} noted`, color: listing.grade.defects.length === 0 ? AZ.green : AZ.amber },
              { label: "Category", value: listing.category.replace(/_/g, " "), capitalize: true },
            ].map((item) => (
              <div key={item.label} className="rounded-lg p-3" style={{ background: AZ.surfaceAlt, border: `1px solid ${AZ.border}` }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>{item.label}</p>
                <p className="text-sm font-semibold capitalize" style={{ color: (item as any).color ?? AZ.ink, fontFamily: "Figtree, sans-serif" }}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Defect list */}
          {listing.grade.defects.length > 0 && (
            <div className="rounded-xl p-4" style={{ background: AZ.surfaceAlt, border: `1px solid ${AZ.border}` }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>Defect Details</p>
              {listing.grade.defects.map((d, i) => (
                <div key={i} className="flex items-start gap-2 text-sm" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
                  <span style={{ color: AZ.amber }}>·</span> {d}
                </div>
              ))}
            </div>
          )}

          {/* Pricing */}
          <div className="rounded-xl p-4" style={{ background: AZ.greenBg, border: `1px solid ${AZ.border}` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: AZ.green, fontFamily: "Figtree, sans-serif" }}>Your Price</p>
                <p className="text-3xl font-black" style={{ color: AZ.ink, fontFamily: "Syne, sans-serif" }}>
                  ₹{livePrice.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg line-through" style={{ color: AZ.ink2, fontFamily: "Syne, sans-serif" }}>
                  ₹{listing.mrp.toLocaleString("en-IN")}
                </p>
                <div className="text-lg font-black" style={{ color: AZ.green, fontFamily: "Syne, sans-serif" }}>-{discount}%</div>
              </div>
            </div>
          </div>


          {!hideBuyButton && (
            <button onClick={handleBuyNow} className="w-full font-semibold py-4 rounded-full text-base transition-all hover:opacity-90 active:scale-[0.98]" style={{ background: AZ.ctaYellow, border: `1px solid ${AZ.ctaYellowBorder}`, color: AZ.ink, fontFamily: "Figtree, sans-serif" }}>
              Buy Now — ₹{livePrice.toLocaleString("en-IN")}
            </button>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(15,17,17,0.85)" }}
          onClick={() => setLightboxImg(null)}
        >
          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightboxImg} alt="Inspection photo" className="w-full rounded-2xl" style={{ maxHeight: "80vh", objectFit: "contain" }} />
            <button
              onClick={() => setLightboxImg(null)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: AZ.card, color: AZ.ink, border: `1px solid ${AZ.border}` }}
            >
              <X size={18} />
            </button>
            <div className="absolute bottom-3 left-3 text-xs px-2 py-1 rounded font-semibold" style={{ background: AZ.green, color: "#fff", fontFamily: "Figtree, sans-serif" }}>
              AI Inspection · {listing.product_name}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
