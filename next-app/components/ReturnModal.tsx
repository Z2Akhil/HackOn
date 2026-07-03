"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GradeResult, DispositionResult } from "@/types";
import GradeCard from "@/components/GradeCard";
import DispositionCard from "@/components/DispositionCard";
import { storeVideo } from "@/lib/video-store";
import TriageRoom from "@/components/TriageRoom";
import { ConditionReport } from "@/hooks/useConditionAssessment";
import { AZ } from "@/lib/ui-theme";
import { Check } from "lucide-react";

const CDN = "https://cdn.dummyjson.com/product-images";
export const DEMO_ORDERS = [
  { id: "o006", product_id: "p012", product_name: "boAt Airdopes 141 TWS Earbuds",     category: "electronics",     mrp: 1299,  ordered: "2026-06-12", image: `${CDN}/mobile-accessories/apple-airpods/thumbnail.webp` },
  { id: "o007", product_id: "p005", product_name: "OnePlus Nord CE 4 (8GB/128GB)",     category: "electronics",     mrp: 24999, ordered: "2026-06-14", image: `${CDN}/smartphones/oppo-a57/thumbnail.webp` },
  { id: "o002", product_id: "p001", product_name: "Sony WH-1000XM5 Headphones",       category: "electronics",     mrp: 29990, ordered: "2026-05-22", image: `${CDN}/mobile-accessories/apple-airpods-max-silver/thumbnail.webp` },
  { id: "o003", product_id: "p004", product_name: "Levis 511 Slim Fit Jeans",          category: "apparel",         mrp: 4999,  ordered: "2026-06-01", image: `${CDN}/mens-shirts/blue-&-black-check-shirt/thumbnail.webp` },
  { id: "o001", product_id: "p003", product_name: "Bajaj Mixer Grinder 750W",         category: "home_appliances",  mrp: 3499,  ordered: "2026-05-18", image: `${CDN}/kitchen-accessories/boxed-blender/thumbnail.webp` },
  { id: "o004", product_id: "p009", product_name: "Bombay Dyeing Double Bedsheet Set", category: "home",            mrp: 1499,  ordered: "2026-06-05", image: `${CDN}/furniture/annibale-colombo-bed/thumbnail.webp` },
];

const RETURN_REASONS = [
  { value: "defective",        label: "Defective / Not working",  icon: "⚡" },
  { value: "wrong_size",       label: "Wrong size / Doesn't fit", icon: "📏" },
  { value: "changed_mind",     label: "Changed my mind",          icon: "💭" },
  { value: "wrong_variant",    label: "Wrong variant / colour",   icon: "🎨" },
  { value: "not_as_described", label: "Others",                   icon: "✏️" },
];

// Only "Others" takes a free-text detail — it's the catch-all, and the note
// feeds the AI grading as a verified-against-photos hint.
const NOTE_REASONS = new Set(["not_as_described"]);
const NOTE_PLACEHOLDER: Record<string, string> = {
  not_as_described: "Tell us why you're returning it — e.g. colour is grey not blue, wrong item received, missing parts",
};

const MOCK_GRADE: GradeResult = {
  grade: "A-", functional_risk: "low",
  defects: ["minor scuff on base", "light wear on surface"],
  packaging_status: "missing_box", accessories_complete: true, confidence: 0.88,
};
const MOCK_DISPOSITION: DispositionResult = {
  decision: "resell",
  ev_table: { resell: 910, refurbish: 490, donate: 245, recycle: 280, exchange: 0 },
  score_breakdown: {
    resell:    { economic: 0.306, sustainability: 0.70, trust: 0.90, final: 0.543 },
    refurbish: { economic: 0.165, sustainability: 0.75, trust: 0.70, final: 0.378 },
    donate:    { economic: 0.082, sustainability: 1.00, trust: 0.60, final: 0.361 },
    recycle:   { economic: 0.094, sustainability: 0.85, trust: 0.30, final: 0.167 },
    exchange:  { economic: 0.000, sustainability: 0.65, trust: 0.80, final: 0.195 },
  },
  estimated_recovery: 910, circularity_score: 74, co2_saved_kg: 14.2,
  reasoning_text: "The A- grade with low functional risk makes open-box resale the optimal channel, recovering ₹910 — the highest expected value across all 5 disposition options. Reselling keeps the product in circulation and earns 50 green credits while avoiding unnecessary processing costs.",
  green_credits: 50, listing_flagged: false,
};

type Order = typeof DEMO_ORDERS[0];
type Step = "reason" | "method" | "upload" | "triage" | "extracting" | "grading" | "result";

// Map the live-triage ConditionReport onto the GradeResult the disposition
// engine expects, so the live path feeds the exact same downstream pipeline.
const SEVERITY_RANK: Record<string, number> = { minor: 1, moderate: 2, severe: 3 };
const TRIAGE_PACKAGING_MAP: Record<string, string> = {
  original_box: "original_box",
  generic_packaging: "original_packaging",
  no_packaging: "missing_box",
  unknown: "missing_box",
};

function conditionToGrade(report: ConditionReport): GradeResult {
  const maxSev = (report.defects ?? []).reduce(
    (m, d) => Math.max(m, SEVERITY_RANK[d.severity] ?? 0),
    0
  );

  let grade: GradeResult["grade"];
  switch (report.overall_condition) {
    case "like_new": grade = "A"; break;
    case "used_good": grade = "A-"; break;
    case "used_with_damage": grade = maxSev >= 3 ? "B" : "B+"; break;
    case "heavily_damaged": grade = "C"; break;
    default: grade = "B+";
  }

  let functional_risk: GradeResult["functional_risk"];
  if (report.overall_condition === "heavily_damaged" || maxSev >= 3) functional_risk = "high";
  else if (maxSev === 2) functional_risk = "medium";
  else if (maxSev === 1) functional_risk = "low";
  else functional_risk = "none";

  return {
    grade,
    functional_risk,
    defects: (report.defects ?? []).map(
      (d) => `${d.type.replace(/_/g, " ")} on ${d.location}`
    ),
    packaging_status: TRIAGE_PACKAGING_MAP[report.packaging_status] ?? "missing_box",
    accessories_complete: report.accessories_complete !== false, // null/true → true
    confidence: report.confidence ?? 0.85,
  };
}

// Convert a Base64 JPEG (no data prefix) captured during triage into a File
// so it can be stored alongside upload-path listings.
function base64ToFile(b64: string, name: string): File {
  const byteString = atob(b64);
  const arr = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) arr[i] = byteString.charCodeAt(i);
  return new File([arr], name, { type: "image/jpeg" });
}

const DECISION_CONFIG = {
  resell: {
    icon: "🏷️", color: AZ.green, bg: AZ.greenBg, border: AZ.border,
    title: "Listed on Marketplace",
    badge: (d: DispositionResult) => `+${d.green_credits ?? 50} Green Credits earned`,
    body: (d: DispositionResult) => `Your item is now live on the ReLoop marketplace as an AI-certified open-box listing. It has also been saved to your My Listings page. You'll receive ₹${d.estimated_recovery?.toLocaleString("en-IN")} once a buyer is matched and the sale completes.`,
    meta: (d: DispositionResult) => [`₹${d.estimated_recovery?.toLocaleString("en-IN")} recovery`, `${d.co2_saved_kg} kg CO₂ saved`, `Circularity ${d.circularity_score}/100`],
    cta: "View in My Listings →", ctaHref: "/my-listings",
  },
  refurbish: {
    icon: "🔧", color: AZ.blue, bg: "#EAF1F8", border: AZ.border,
    title: "Sent for Refurbishment",
    badge: () => "Est. ready in 5–7 days",
    body: (d: DispositionResult) => `Your item has been queued for professional repair and quality certification. Once certified, it will be listed on the marketplace as 'Certified Refurbished' and appear in your My Listings page. Estimated recovery: ₹${d.estimated_recovery?.toLocaleString("en-IN")}.`,
    meta: (d: DispositionResult) => [`₹${d.estimated_recovery?.toLocaleString("en-IN")} est. recovery`, `${d.co2_saved_kg} kg CO₂ saved`, "Certified before resale"],
    cta: "View in My Listings →", ctaHref: "/my-listings",
  },
  donate: {
    icon: "🤝", color: "#7C3AED", bg: "#F2EDFB", border: AZ.border,
    title: "Donation Scheduled",
    badge: () => "Tax receipt incoming",
    body: () => "Pickup arranged with NGO partner GreenMitra Foundation within 2–3 days. A tax exemption receipt will be emailed to your registered address.",
    meta: (d: DispositionResult) => [`${d.co2_saved_kg} kg CO₂ saved`, `Circularity ${d.circularity_score}/100`, "1 product → 2nd life"],
    cta: "Done", ctaHref: null,
  },
  recycle: {
    icon: "♻️", color: AZ.green, bg: AZ.greenBg, border: AZ.border,
    title: "Recycling Initiated",
    badge: (d: DispositionResult) => `${d.co2_saved_kg} kg CO₂ prevented`,
    body: () => "Material recovery team will collect within 3–5 days. All hazardous components safely processed per e-waste norms. Raw materials re-enter manufacturing supply chain.",
    meta: (d: DispositionResult) => [`${d.co2_saved_kg} kg CO₂ saved`, "Zero landfill", `Circularity ${d.circularity_score}/100`],
    cta: "Done", ctaHref: null,
  },
  exchange: {
    icon: "🔄", color: AZ.amber, bg: AZ.amberBg, border: AZ.border,
    title: "Replacement Dispatched",
    badge: () => "Arrives in 2–3 days",
    body: () => "A new unit has been dispatched. Please keep your OTP ready for delivery verification. The returned item undergoes refurbishment before re-entering the supply chain.",
    meta: (_d: DispositionResult, otp: string) => [`OTP: ${otp}`, `Tracking: RLP${otp.slice(0, 4)}IN`, "2–3 business days"],
    cta: "Done", ctaHref: null,
  },
} as const;

// ── Keep-It Negotiation Panel ───────────────────────────────────────────────
function KeepItPanel({
  offer, productName, onAccept, onDecline,
}: {
  offer: NonNullable<DispositionResult["keep_it"]>;
  productName: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="rounded-2xl overflow-hidden animate-fade-up" style={{ border: `1px solid ${AZ.green}` }}>
      {/* Header band */}
      <div className="px-5 py-4 flex items-center gap-3" style={{ background: AZ.greenBg }}>
        <span className="text-2xl">💚</span>
        <div className="flex-1">
          <p className="font-bold" style={{ color: AZ.ink, fontFamily: "Syne, sans-serif" }}>Keep It & Get Cash Back</p>
          <span className="text-xs font-semibold" style={{ color: AZ.green, fontFamily: "Figtree, sans-serif" }}>
            Smartest option · no shipping needed
          </span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: AZ.card, color: AZ.green, border: `1px solid ${AZ.green}`, fontFamily: "Figtree, sans-serif" }}>
          AI Offer
        </span>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4" style={{ background: AZ.card }}>
        {/* Big refund number */}
        <div className="rounded-xl p-4 text-center" style={{ background: AZ.greenBg, border: `1px solid ${AZ.border}` }}>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: AZ.green, fontFamily: "Figtree, sans-serif" }}>Instant partial refund</p>
          <p className="text-4xl font-black mt-1" style={{ color: AZ.green, fontFamily: "Syne, sans-serif" }}>
            ₹{offer.refund_amount.toLocaleString("en-IN")}
          </p>
          <p className="text-xs mt-1" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>credited the moment you accept</p>
        </div>

        <p className="text-xs leading-relaxed" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
          {offer.reasoning}
        </p>

        {/* Meta pills */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: AZ.greenBg, border: `1px solid ${AZ.border}`, color: AZ.green, fontFamily: "Figtree, sans-serif" }}>
            +{offer.green_credits} green credits
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: AZ.greenBg, border: `1px solid ${AZ.border}`, color: AZ.green, fontFamily: "Figtree, sans-serif" }}>
            {offer.co2_saved_kg} kg CO₂ saved
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: AZ.surfaceAlt, border: `1px solid ${AZ.border}`, color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
            no pickup · no wait
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onAccept}
            className="flex-1 font-semibold py-3 rounded-full transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: AZ.ctaYellow, border: `1px solid ${AZ.ctaYellowBorder}`, color: AZ.ink, fontFamily: "Figtree, sans-serif" }}
          >
            Accept ₹{offer.refund_amount.toLocaleString("en-IN")} & Keep It
          </button>
          <button
            onClick={onDecline}
            className="px-4 py-3 rounded-full text-sm font-semibold transition-all hover:opacity-80"
            style={{ background: AZ.card, color: AZ.ink, border: `1px solid ${AZ.border}`, fontFamily: "Figtree, sans-serif" }}
          >
            No, return it
          </button>
        </div>
      </div>
    </div>
  );
}

function KeepItAcceptedPanel({ offer, onClose }: { offer: NonNullable<DispositionResult["keep_it"]>; onClose: () => void }) {
  return (
    <div className="rounded-2xl overflow-hidden animate-fade-up" style={{ border: `1px solid ${AZ.green}` }}>
      <div className="px-5 py-4 flex items-center gap-3" style={{ background: AZ.greenBg }}>
        <span className="text-2xl">🎉</span>
        <div className="flex-1">
          <p className="font-bold" style={{ color: AZ.ink, fontFamily: "Syne, sans-serif" }}>Return Prevented!</p>
          <span className="text-xs font-semibold" style={{ color: AZ.green, fontFamily: "Figtree, sans-serif" }}>
            ₹{offer.refund_amount.toLocaleString("en-IN")} refunded · item is yours to keep
          </span>
        </div>
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: AZ.green, color: "#fff" }}><Check size={16} strokeWidth={3} /></div>
      </div>
      <div className="px-5 py-4 space-y-4" style={{ background: AZ.card }}>
        <p className="text-xs leading-relaxed" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
          ₹{offer.refund_amount.toLocaleString("en-IN")} has been credited to your account and {offer.green_credits} green credits added.
          Nothing needs to be shipped — you keep the item. This avoided {offer.co2_saved_kg} kg of CO₂ from reverse logistics
          and saved ReLoop ₹{offer.seller_saves.toLocaleString("en-IN")} in handling costs.
        </p>
        <button
          onClick={onClose}
          className="w-full font-semibold py-3 rounded-full transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: AZ.ctaYellow, border: `1px solid ${AZ.ctaYellowBorder}`, color: AZ.ink, fontFamily: "Figtree, sans-serif" }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

function NextStepPanel({
  disposition, otpCode, onClose, onList,
}: {
  disposition: DispositionResult;
  otpCode: string;
  onClose: () => void;
  onList?: () => Promise<void>;
}) {
  const router = useRouter();
  const [listState, setListState] = useState<"idle" | "saving" | "done">("idle");
  const [fcState, setFcState] = useState<"idle" | "done">("idle");
  const key = (disposition.decision ?? "resell") as keyof typeof DECISION_CONFIG;
  const cfg = DECISION_CONFIG[key] ?? DECISION_CONFIG.resell;
  const isListable = ["resell", "refurbish"].includes(disposition.decision);

  async function handleList() {
    if (!onList || listState !== "idle") return;
    setListState("saving");
    await onList();
    setListState("done");
  }

  // "Return to fulfillment centre" confirmation — a page-like takeover with a
  // status timeline and a redirect back to home.
  if (fcState === "done") {
    const steps = [
      { done: true, label: "Return request initiated" },
      { done: true, label: "Pickup partner informed" },
      { done: false, label: "On the way to the nearest fulfillment centre" },
    ];
    return (
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${AZ.border}` }}>
        {/* Header band */}
        <div className="px-5 py-4 flex items-center gap-3" style={{ background: "#EAF1F8" }}>
          <span className="text-2xl">🚚</span>
          <div className="flex-1">
            <p className="font-bold" style={{ color: AZ.ink, fontFamily: "Syne, sans-serif" }}>Return to fulfillment centre</p>
            <span className="text-xs font-semibold" style={{ color: AZ.blue, fontFamily: "Figtree, sans-serif" }}>Initiated · on the way</span>
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: AZ.blue, color: "#fff" }}><Check size={16} strokeWidth={3} /></div>
        </div>

        {/* Body */}
        <div className="px-5 py-6 space-y-5" style={{ background: AZ.card }}>
          <div className="space-y-2">
            {steps.map((s) => (
              <div key={s.label} className="flex items-center gap-2.5">
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: s.done ? AZ.green : AZ.amber, color: "#fff" }}>{s.done ? "✓" : "→"}</span>
                <span className="text-xs" style={{ color: s.done ? AZ.ink : AZ.ink2, fontFamily: "Figtree, sans-serif" }}>{s.label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs leading-relaxed" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
            Your item is being routed to the nearest Amazon fulfillment centre for inspection and restocking. You&apos;ll receive tracking updates on your registered contact.
          </p>
          <button
            onClick={() => { onClose(); router.push("/"); }}
            className="w-full font-semibold py-3 rounded-full transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: AZ.ctaYellow, border: `1px solid ${AZ.ctaYellowBorder}`, color: AZ.ink, fontFamily: "Figtree, sans-serif" }}
          >
            Back to Home →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${cfg.border}` }}>
      {/* Header band */}
      <div className="px-5 py-4 flex items-center gap-3" style={{ background: cfg.bg }}>
        <span className="text-2xl">{cfg.icon}</span>
        <div className="flex-1">
          <p className="font-bold" style={{ color: AZ.ink, fontFamily: "Syne, sans-serif" }}>{cfg.title}</p>
          <span className="text-xs font-semibold" style={{ color: cfg.color, fontFamily: "Figtree, sans-serif" }}>
            {cfg.badge(disposition)}
          </span>
        </div>
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: cfg.color, color: "#fff" }}><Check size={16} strokeWidth={3} /></div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4" style={{ background: AZ.card }}>
        <p className="text-xs leading-relaxed" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
          {cfg.body(disposition)}
        </p>

        {/* Meta pills */}
        <div className="flex flex-wrap gap-2">
          {cfg.meta(disposition, otpCode).map((m) => (
            <span key={m} className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, fontFamily: "Figtree, sans-serif" }}>
              {m}
            </span>
          ))}
        </div>

        {/* List on Marketplace button — only for resell/refurbish, before listing */}
        {isListable && listState !== "done" && (
          <button
            onClick={handleList}
            disabled={listState === "saving"}
            className="w-full font-semibold py-3 rounded-full transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            style={{ background: AZ.ctaYellow, border: `1px solid ${AZ.ctaYellowBorder}`, color: AZ.ink, fontFamily: "Figtree, sans-serif" }}
          >
            {listState === "saving" ? "Listing…" : "List on Marketplace →"}
          </button>
        )}

        {/* Return to fulfillment centre — alternative to listing */}
        {isListable && listState !== "done" && (
          <button
            onClick={() => setFcState("done")}
            className="w-full font-semibold py-3 rounded-full transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: AZ.card, border: `1px solid ${AZ.border}`, color: AZ.ink, fontFamily: "Figtree, sans-serif" }}
          >
            Return to fulfillment centre →
          </button>
        )}

        {/* Listed confirmation */}
        {isListable && listState === "done" && (
          <div className="rounded-xl p-3 space-y-2" style={{ background: AZ.greenBg, border: `1px solid ${AZ.border}` }}>
            <p className="text-xs font-semibold" style={{ color: AZ.green, fontFamily: "Figtree, sans-serif" }}>
              ✓ Listed on Marketplace · Added to My Listings
            </p>
            <p className="text-xs" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
              Your inspection photos are now public. Buyers are being matched.
            </p>
            <button
              onClick={() => { onClose(); router.push("/my-listings"); }}
              className="text-xs font-semibold underline"
              style={{ color: AZ.link, fontFamily: "Figtree, sans-serif" }}
            >
              View in My Listings →
            </button>
          </div>
        )}

        {/* Non-listable decisions: just Done */}
        {!isListable && (
          <button
            onClick={() => { onClose(); if (cfg.ctaHref) router.push(cfg.ctaHref); }}
            className="w-full font-semibold py-3 rounded-full transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: AZ.ctaYellow, border: `1px solid ${AZ.ctaYellowBorder}`, color: AZ.ink, fontFamily: "Figtree, sans-serif" }}
          >
            {cfg.cta}
          </button>
        )}
      </div>
    </div>
  );
}

async function compressToBase64(file: File, maxWidth = 600, quality = 0.65): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(""); };
    img.src = url;
  });
}

async function saveListingToStorage(
  order: Order,
  grade: GradeResult,
  disposition: DispositionResult,
  frameFiles: File[]
): Promise<string> {
  const listingId = `ul_${order.id}_${Date.now()}`;
  try {
    const inspection_images = (
      await Promise.all(frameFiles.slice(0, 3).map((f) => compressToBase64(f)))
    ).filter(Boolean);

    const listing = {
      id: listingId,
      product_id: order.product_id,
      product_name: order.product_name,
      category: order.category,
      mrp: order.mrp,
      asking_price: Math.max(1, Math.round(disposition.estimated_recovery)),
      grade,
      decision: disposition.decision,
      listed_at: new Date().toISOString(),
      image: inspection_images[0] ?? "",
      circularity_score: disposition.circularity_score,
      co2_saved_kg: disposition.co2_saved_kg,
      expected_lifespan_years: 3,
      warranty_months: 0,
      inspection_images,
      green_credits: disposition.green_credits ?? 50,
    };

    const existing = JSON.parse(localStorage.getItem("reloop_my_listings") ?? "[]");
    const deduped = existing.filter((l: { product_id: string }) => l.product_id !== order.product_id);
    deduped.unshift(listing);
    localStorage.setItem("reloop_my_listings", JSON.stringify(deduped));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.error("[listing] Failed to save:", e);
  }
  return listingId;
}

async function extractVideoFrames(file: File): Promise<File[]> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true;
    video.crossOrigin = "anonymous";

    video.addEventListener("loadedmetadata", async () => {
      const duration = video.duration;
      const timestamps = [0.25, 0.50, 0.75].map((t) => t * duration);
      const frames: File[] = [];

      for (const ts of timestamps) {
        await new Promise<void>((res) => {
          video.currentTime = ts;
          video.addEventListener("seeked", () => {
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            canvas.getContext("2d")!.drawImage(video, 0, 0);
            canvas.toBlob((blob) => {
              if (blob) frames.push(new File([blob], `frame_${Math.round(ts)}s.jpg`, { type: "image/jpeg" }));
              res();
            }, "image/jpeg", 0.85);
          }, { once: true });
        });
      }
      URL.revokeObjectURL(url);
      resolve(frames);
    });

    video.addEventListener("error", () => { URL.revokeObjectURL(url); resolve([]); });
    video.load();
  });
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.src = url;
    video.addEventListener("loadedmetadata", () => { URL.revokeObjectURL(url); resolve(video.duration); });
    video.addEventListener("error", () => { URL.revokeObjectURL(url); resolve(0); });
    video.load();
  });
}

export default function ReturnModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const [step, setStep] = useState<Step>("reason");
  const [reason, setReason] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [disposition, setDisposition] = useState<DispositionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileError, setFileError] = useState("");
  const [otpCode] = useState(() => Math.floor(100000 + Math.random() * 900000).toString());
  const [keepItChoice, setKeepItChoice] = useState<"pending" | "accepted" | "declined">("pending");
  const [pendingListing, setPendingListing] = useState<{
    grade: GradeResult;
    disposition: DispositionResult;
    frameFiles: File[];
    videoFile?: File;
  } | null>(null);
  const isVideo = mediaFiles[0]?.type.startsWith("video/") ?? false;
  const hasFiles = mediaFiles.length > 0;

  async function handleFilesSelect(fileList: FileList) {
    setFileError("");
    const files = Array.from(fileList);
    const videoFile = files.find((f) => f.type.startsWith("video/"));
    if (videoFile) {
      const dur = await getVideoDuration(videoFile);
      if (dur > 15) {
        setFileError("Video must be 15 seconds or shorter. Please trim and retry.");
        return;
      }
      setMediaFiles([videoFile]);
      return;
    }
    const images = files.filter((f) => f.type.startsWith("image/"));
    setMediaFiles((prev) => {
      const prevImages = prev.filter((f) => f.type.startsWith("image/"));
      return [...prevImages, ...images].slice(0, 3);
    });
  }

  function removeFile(idx: number) {
    setMediaFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  const STEPS = ["Reason", "Inspect", "Result"];
  const STEP_IDX: Record<Step, number> = { reason: 0, method: 0, upload: 1, triage: 1, extracting: 1, grading: 1, result: 2 };
  const currentStepIdx = STEP_IDX[step];

  // Shared: given a grade + any inspection files, run disposition and show result.
  async function runDisposition(gradeData: GradeResult, filesForStorage: File[], videoFile?: File) {
    setGrade(gradeData);

    let dispData: DispositionResult = MOCK_DISPOSITION;
    try {
      const res = await fetch("/api/disposition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade: gradeData, product_id: order.product_id, product_name: order.product_name, category: order.category, mrp: order.mrp, return_reason: reason }),
      });
      if (res.ok) { const p = await res.json(); if (p?.decision) dispData = p; }
    } catch {}
    setDisposition(dispData);

    if (["resell", "refurbish"].includes(dispData.decision) && filesForStorage.length > 0) {
      setPendingListing({
        grade: gradeData,
        disposition: dispData,
        frameFiles: filesForStorage,
        videoFile,
      });
    }

    setKeepItChoice("pending");
    setLoading(false);
    setStep("result");
  }

  // Upload path: grade uploaded photos/video, then run disposition.
  async function handleSubmit() {
    if (!reason) return;
    setLoading(true);

    let gradeData: GradeResult = MOCK_GRADE;
    let filesForStorage: File[] = [];
    try {
      const fd = new FormData();
      if (customerNote.trim()) fd.append("customer_note", customerNote.trim());

      if (isVideo) {
        setStep("extracting");
        const frames = await extractVideoFrames(mediaFiles[0]);
        setStep("grading");
        if (frames.length > 0) {
          frames.forEach((f, i) => fd.append(`frame${i}`, f));
          filesForStorage = frames;
        }
      } else {
        mediaFiles.forEach((f, i) => fd.append(`frame${i}`, f));
        filesForStorage = mediaFiles;
        setStep("grading");
      }

      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 30000);
      const res = await fetch("/api/grade", { method: "POST", body: fd, signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) { const p = await res.json(); if (p?.grade) gradeData = p; }
    } catch {}

    await runDisposition(gradeData, filesForStorage, isVideo ? mediaFiles[0] : undefined);
  }

  // Live-triage path: the AI condition report maps to a grade, then same flow.
  async function handleTriageComplete(report: ConditionReport, frames: string[]) {
    setLoading(true);
    setStep("grading");
    const gradeData = conditionToGrade(report);
    const files = frames.slice(-3).map((b64, i) => base64ToFile(b64, `triage_frame_${i}.jpg`));
    await runDisposition(gradeData, files, undefined);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(15,17,17,0.5)", backdropFilter: "blur(8px)" }}>
      <div
        className={`w-full ${step === "triage" ? "sm:max-w-4xl" : "sm:max-w-lg"} max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl`}
        style={{ background: AZ.card, border: `1px solid ${AZ.border}` }}
      >
        {/* Modal header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4" style={{ background: AZ.card, borderBottom: `1px solid ${AZ.border}` }}>
          <div className="flex items-center gap-3">
            {/* Order thumbnail */}
            <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0" style={{ background: AZ.surfaceAlt }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={order.image} alt={order.product_name} className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight" style={{ color: AZ.ink, fontFamily: "Figtree, sans-serif" }}>Return Request</p>
              <p className="text-xs" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>{order.product_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all hover:opacity-70" style={{ background: AZ.surfaceAlt, color: AZ.ink2 }}>
            ✕
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Step progress */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                    style={{ background: i < currentStepIdx ? AZ.green : i === currentStepIdx ? AZ.greenBg : AZ.surfaceAlt, border: i === currentStepIdx ? `1px solid ${AZ.green}` : `1px solid ${AZ.border}`, color: i < currentStepIdx ? "#fff" : i === currentStepIdx ? AZ.green : AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
                    {i < currentStepIdx ? "✓" : i + 1}
                  </div>
                  <span className="text-xs font-medium" style={{ color: i === currentStepIdx ? AZ.ink : AZ.ink2, fontFamily: "Figtree, sans-serif" }}>{s}</span>
                </div>
                {i < STEPS.length - 1 && <div className="flex-1 h-px" style={{ background: i < currentStepIdx ? AZ.green : AZ.border }} />}
              </div>
            ))}
          </div>

          {/* Step: Reason */}
          {step === "reason" && (
            <div className="space-y-2">
              <p className="font-bold" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>Why are you returning it?</p>
              <p className="text-xs mb-3" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>Return reason is the strongest disposition signal.</p>
              {RETURN_REASONS.map((r) => {
                const selected = reason === r.value;
                const needsNote = NOTE_REASONS.has(r.value);
                return (
                  <div key={r.value}>
                    <button
                      onClick={() => {
                        if (needsNote) {
                          setReason(r.value);
                        } else {
                          setReason(r.value); setCustomerNote(""); setStep("method");
                        }
                      }}
                      className="w-full text-left p-3.5 rounded-xl flex items-center gap-3 transition-all"
                      style={{ background: selected ? AZ.card : AZ.surfaceAlt, border: `1px solid ${selected ? AZ.borderDark : AZ.border}` }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = AZ.borderDark)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = selected ? AZ.borderDark : AZ.border)}
                    >
                      <span className="text-lg w-7 text-center">{r.icon}</span>
                      <span className="font-medium text-sm" style={{ color: AZ.ink, fontFamily: "Figtree, sans-serif" }}>{r.label}</span>
                      <span className="ml-auto text-xs" style={{ color: AZ.ink2 }}>{selected && needsNote ? "" : "→"}</span>
                    </button>

                    {/* Detail box — feeds the AI grading as a verified-against-photos hint */}
                    {selected && needsNote && (
                      <div className="mt-2 space-y-2 animate-fade-in">
                        <textarea
                          value={customerNote}
                          onChange={(e) => setCustomerNote(e.target.value)}
                          rows={3}
                          maxLength={300}
                          autoFocus
                          placeholder={NOTE_PLACEHOLDER[r.value]}
                          className="w-full text-sm p-3 rounded-xl outline-none resize-none"
                          style={{ background: AZ.card, border: `1px solid ${AZ.border}`, color: AZ.ink, fontFamily: "Figtree, sans-serif" }}
                        />
                        <p className="text-[11px] leading-relaxed" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
                          Optional — our AI uses this to guide the photo inspection, then verifies every claim against your images.
                        </p>
                        <button
                          onClick={() => setStep("method")}
                          className="w-full font-semibold py-2.5 rounded-full transition-all hover:opacity-90 active:scale-[0.98]"
                          style={{ background: AZ.ctaYellow, border: `1px solid ${AZ.ctaYellowBorder}`, color: AZ.ink, fontFamily: "Figtree, sans-serif" }}
                        >
                          Continue →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Step: Inspection method choice */}
          {step === "method" && (
            <div className="space-y-3">
              <p className="font-bold" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>How would you like to inspect the item?</p>
              <p className="text-xs mb-1" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>AI grades the item to decide the best outcome — keep, resell, refurbish, donate or recycle.</p>

              <button
                onClick={() => setStep("triage")}
                className="w-full text-left p-4 rounded-xl flex items-center gap-3 transition-all"
                style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.3)" }}
              >
                <span className="text-2xl w-8 text-center">🎥</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm" style={{ color: AZ.ink, fontFamily: "Figtree, sans-serif" }}>Live AI Inspection</span>
                    <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", fontFamily: "Figtree, sans-serif" }}>Recommended</span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>Camera + voice guide detects defects live, then auto-grades.</p>
                </div>
                <span className="text-xs" style={{ color: AZ.ink2 }}>→</span>
              </button>

              <button
                onClick={() => setStep("upload")}
                className="w-full text-left p-4 rounded-xl flex items-center gap-3 transition-all"
                style={{ background: AZ.surfaceAlt, border: `1px solid ${AZ.border}` }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = AZ.borderDark)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = AZ.border)}
              >
                <span className="text-2xl w-8 text-center">📷</span>
                <div className="flex-1">
                  <span className="font-semibold text-sm" style={{ color: AZ.ink, fontFamily: "Figtree, sans-serif" }}>Upload Photos or Video</span>
                  <p className="text-xs mt-0.5" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>Up to 3 photos or a short clip — graded by AI vision.</p>
                </div>
                <span className="text-xs" style={{ color: AZ.ink2 }}>→</span>
              </button>

              <button onClick={() => setStep("reason")} className="w-full text-sm" style={{ color: AZ.ink2 }}>← Back</button>
            </div>
          )}

          {/* Step: Live triage inspection */}
          {step === "triage" && (
            <div className="space-y-3">
              <div>
                <p className="font-bold" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>Live AI Inspection</p>
                <p className="text-xs mt-0.5" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
                  Start the session, rotate the item as the agent guides you, then tap <strong>Assess Condition</strong> to grade and continue.
                </p>
              </div>
              <div style={{ height: "62vh", borderRadius: 12, overflow: "hidden", border: `1px solid ${AZ.border}` }}>
                <TriageRoom embedded onAssessmentComplete={handleTriageComplete} />
              </div>
              <button onClick={() => setStep("method")} className="w-full text-sm" style={{ color: AZ.ink2 }}>← Back to inspection options</button>
            </div>
          )}

          {/* Step: Upload */}
          {step === "upload" && (
            <div className="space-y-4">
              <p className="font-bold" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>Upload photos</p>

              {/* Image thumbnails */}
              {!isVideo && mediaFiles.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {mediaFiles.map((f, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden" style={{ background: AZ.surfaceAlt }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={URL.createObjectURL(f)} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeFile(i)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: "rgba(15,17,17,0.7)", color: "#fff" }}
                      >✕</button>
                    </div>
                  ))}
                  {mediaFiles.length < 3 && (
                    <label className="aspect-square rounded-xl flex flex-col items-center justify-center cursor-pointer" style={{ border: `2px dashed ${AZ.borderDark}`, background: AZ.surfaceAlt }}>
                      <span className="text-xl mb-1" style={{ color: AZ.ink2 }}>+</span>
                      <span className="text-xs" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>{3 - mediaFiles.length} left</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files) handleFilesSelect(e.target.files); }} />
                    </label>
                  )}
                </div>
              )}

              {/* Video display */}
              {isVideo && (
                <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: AZ.surfaceAlt, border: `1px solid ${AZ.green}` }}>
                  <span className="text-2xl">🎥</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: AZ.green, fontFamily: "Figtree, sans-serif" }}>{mediaFiles[0].name}</p>
                    <p className="text-xs mt-0.5" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>3 frames will be extracted for analysis</p>
                  </div>
                  <button onClick={() => setMediaFiles([])} className="text-xs px-2 py-1 rounded-lg" style={{ background: AZ.card, color: AZ.ink2, border: `1px solid ${AZ.border}` }}>✕</button>
                </div>
              )}

              {/* Upload zone (shown when no files yet) */}
              {!hasFiles && (
                <label className="block cursor-pointer">
                  <div className="rounded-xl p-8 text-center" style={{ border: `2px dashed ${AZ.border}`, background: AZ.surfaceAlt }}>
                    <p className="text-3xl mb-2">📷</p>
                    <p className="text-sm font-semibold" style={{ color: AZ.ink, fontFamily: "Figtree, sans-serif" }}>Click to upload photos or video</p>
                    <p className="text-xs mt-1" style={{ color: AZ.ink2 }}>Up to 3 photos · or 1 video (max 15 s)</p>
                  </div>
                  <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => { if (e.target.files) handleFilesSelect(e.target.files); }} />
                </label>
              )}

              {fileError && (
                <p className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: AZ.redBg, border: `1px solid ${AZ.red}`, color: AZ.red, fontFamily: "Figtree, sans-serif" }}>
                  ⚠ {fileError}
                </p>
              )}

              <button onClick={handleSubmit} disabled={!hasFiles || loading}
                className="w-full font-semibold py-3 rounded-full transition-all"
                style={{ background: !hasFiles ? AZ.surfaceAlt : AZ.ctaYellow, color: !hasFiles ? AZ.ink2 : AZ.ink, fontFamily: "Figtree, sans-serif", cursor: !hasFiles ? "not-allowed" : "pointer", border: !hasFiles ? `1px solid ${AZ.border}` : `1px solid ${AZ.ctaYellowBorder}` }}>
                {!hasFiles ? "Upload a photo or video to continue" : isVideo ? "Extract Frames & Grade →" : `Submit ${mediaFiles.length} photo${mediaFiles.length > 1 ? "s" : ""} & Grade with AI →`}
              </button>
              <button onClick={() => setStep("method")} className="w-full text-sm" style={{ color: AZ.link }}>← Back</button>
            </div>
          )}

          {/* Step: Extracting frames */}
          {step === "extracting" && (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl" style={{ background: "#EAF1F8", border: `1px solid ${AZ.border}` }}>🎞️</div>
              <p className="font-bold mb-1" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>Extracting Inspection Frames</p>
              <p className="text-xs mb-2" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>Sampling 3 frames at 25% · 50% · 75% of video</p>
              <p className="text-xs mb-5" style={{ color: AZ.blue, fontFamily: "Figtree, sans-serif" }}>Each frame analysed separately by Gemini 2.5 Flash</p>
              <div className="flex gap-1.5 justify-center">
                {[0,1,2,3].map((i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: AZ.blue, animation: `bounce 1s ${i * 150}ms infinite` }} />
                ))}
              </div>
            </div>
          )}

          {/* Step: Grading */}
          {step === "grading" && (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl" style={{ background: AZ.greenBg, border: `1px solid ${AZ.border}` }}>🔍</div>
              <p className="font-bold mb-1" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>AI Grading in Progress</p>
              <p className="text-xs mb-5" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
                Gemini 2.5 Flash analysing · Computing worst-case grade across frames
              </p>
              <div className="flex gap-1.5 justify-center">
                {[0,1,2,3].map((i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: AZ.green, animation: `bounce 1s ${i * 150}ms infinite` }} />
                ))}
              </div>
            </div>
          )}

          {/* Step: Result */}
          {step === "result" && grade && disposition && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-bold" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>Return Decision</p>
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: AZ.greenBg, color: AZ.green, border: `1px solid ${AZ.border}`, fontFamily: "Figtree, sans-serif" }}>AI Complete ✓</span>
              </div>

              {/* Keep-It negotiation takes priority when the item is worth keeping */}
              {disposition.keep_it?.eligible && keepItChoice === "pending" ? (
                <>
                  <GradeCard grade={grade} />
                  <KeepItPanel
                    offer={disposition.keep_it}
                    productName={order.product_name}
                    onAccept={() => setKeepItChoice("accepted")}
                    onDecline={() => setKeepItChoice("declined")}
                  />
                </>
              ) : disposition.keep_it?.eligible && keepItChoice === "accepted" ? (
                <>
                  <GradeCard grade={grade} />
                  <KeepItAcceptedPanel offer={disposition.keep_it} onClose={onClose} />
                </>
              ) : (
                <>
                  <GradeCard grade={grade} />
                  <DispositionCard disposition={disposition} productName={order.product_name} mrp={order.mrp} />
                  <NextStepPanel
                    disposition={disposition}
                    otpCode={otpCode}
                    onClose={onClose}
                    onList={pendingListing ? async () => {
                      const listingId = await saveListingToStorage(
                        order,
                        pendingListing.grade,
                        pendingListing.disposition,
                        pendingListing.frameFiles
                      );
                      if (pendingListing.videoFile) {
                        try { await storeVideo(listingId, pendingListing.videoFile); } catch {}
                      }
                    } : undefined}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
