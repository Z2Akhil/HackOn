"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GradeResult, DispositionResult } from "@/types";
import GradeCard from "@/components/GradeCard";
import DispositionCard from "@/components/DispositionCard";

const CDN = "https://cdn.dummyjson.com/product-images";
export const DEMO_ORDERS = [
  { id: "o001", product_id: "p003", product_name: "Bajaj Mixer Grinder 750W",         category: "home_appliances", mrp: 3499,  ordered: "2026-05-18", image: `${CDN}/kitchen-accessories/boxed-blender/thumbnail.webp` },
  { id: "o002", product_id: "p001", product_name: "Sony WH-1000XM5 Headphones",       category: "electronics",     mrp: 29990, ordered: "2026-05-22", image: `${CDN}/mobile-accessories/apple-airpods-max-silver/thumbnail.webp` },
  { id: "o003", product_id: "p004", product_name: "Levis 511 Slim Fit Jeans",          category: "apparel",         mrp: 4999,  ordered: "2026-06-01", image: `${CDN}/mens-shirts/blue-&-black-check-shirt/thumbnail.webp` },
  { id: "o004", product_id: "p009", product_name: "Bombay Dyeing Double Bedsheet Set", category: "home",            mrp: 1499,  ordered: "2026-06-05", image: `${CDN}/furniture/annibale-colombo-bed/thumbnail.webp` },
];

const RETURN_REASONS = [
  { value: "defective",        label: "Defective / Not working",  icon: "⚡" },
  { value: "wrong_size",       label: "Wrong size / Doesn't fit", icon: "📏" },
  { value: "not_as_described", label: "Not as described",         icon: "📋" },
  { value: "changed_mind",     label: "Changed my mind",          icon: "💭" },
  { value: "wrong_variant",    label: "Wrong variant / colour",   icon: "🎨" },
];

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
type Step = "reason" | "upload" | "extracting" | "grading" | "result";

const DECISION_CONFIG = {
  resell: {
    icon: "🏷️", color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)",
    title: "Listed on Marketplace",
    badge: (d: DispositionResult) => `+${d.green_credits ?? 50} Green Credits earned`,
    body: (d: DispositionResult) => `Your item has been graded and is now live as an open-box listing. You'll receive ₹${d.estimated_recovery?.toLocaleString("en-IN")} once it sells.`,
    meta: (d: DispositionResult) => [`₹${d.estimated_recovery?.toLocaleString("en-IN")} recovery`, `${d.co2_saved_kg} kg CO₂ saved`, `Circularity ${d.circularity_score}/100`],
    cta: "View Listing on Marketplace →", ctaHref: "/marketplace",
  },
  refurbish: {
    icon: "🔧", color: "#3b82f6", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.2)",
    title: "Sent to Refurb Queue",
    badge: () => "Est. ready in 5–7 days",
    body: (d: DispositionResult) => `Our technicians will repair and certify this item. It will be relisted as 'Certified Refurbished', recovering ₹${d.estimated_recovery?.toLocaleString("en-IN")}.`,
    meta: (d: DispositionResult) => [`₹${d.estimated_recovery?.toLocaleString("en-IN")} est. recovery`, `${d.co2_saved_kg} kg CO₂ saved`, "Certified before resale"],
    cta: "Track in Ops Dashboard →", ctaHref: "/dashboard",
  },
  donate: {
    icon: "🤝", color: "#8b5cf6", bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.2)",
    title: "Donation Scheduled",
    badge: () => "Tax receipt incoming",
    body: () => "Pickup arranged with NGO partner GreenMitra Foundation within 2–3 days. A tax exemption receipt will be emailed to your registered address.",
    meta: (d: DispositionResult) => [`${d.co2_saved_kg} kg CO₂ saved`, `Circularity ${d.circularity_score}/100`, "1 product → 2nd life"],
    cta: "View Sustainability Impact →", ctaHref: "/dashboard",
  },
  recycle: {
    icon: "♻️", color: "#14b8a6", bg: "rgba(20,184,166,0.08)", border: "rgba(20,184,166,0.2)",
    title: "Recycling Initiated",
    badge: (d: DispositionResult) => `${d.co2_saved_kg} kg CO₂ prevented`,
    body: () => "Material recovery team will collect within 3–5 days. All hazardous components safely processed per e-waste norms. Raw materials re-enter manufacturing supply chain.",
    meta: (d: DispositionResult) => [`${d.co2_saved_kg} kg CO₂ saved`, "Zero landfill", `Circularity ${d.circularity_score}/100`],
    cta: "View Sustainability Metrics →", ctaHref: "/dashboard",
  },
  exchange: {
    icon: "🔄", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)",
    title: "Replacement Dispatched",
    badge: () => "Arrives in 2–3 days",
    body: () => "A new unit has been dispatched. Please keep your OTP ready for delivery verification. The returned item undergoes refurbishment before re-entering the supply chain.",
    meta: (_d: DispositionResult, otp: string) => [`OTP: ${otp}`, `Tracking: RLP${otp.slice(0, 4)}IN`, "2–3 business days"],
    cta: "Done", ctaHref: null,
  },
} as const;

function NextStepPanel({ disposition, otpCode, onClose }: { disposition: DispositionResult; otpCode: string; onClose: () => void }) {
  const router = useRouter();
  const key = (disposition.decision ?? "resell") as keyof typeof DECISION_CONFIG;
  const cfg = DECISION_CONFIG[key] ?? DECISION_CONFIG.resell;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${cfg.border}` }}>
      {/* Header band */}
      <div className="px-5 py-4 flex items-center gap-3" style={{ background: cfg.bg }}>
        <span className="text-2xl">{cfg.icon}</span>
        <div className="flex-1">
          <p className="font-bold" style={{ color: "#fafafa", fontFamily: "Syne, sans-serif" }}>{cfg.title}</p>
          <span className="text-xs font-semibold" style={{ color: cfg.color, fontFamily: "Figtree, sans-serif" }}>
            {cfg.badge(disposition)}
          </span>
        </div>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: cfg.color, color: "#0c0c0e" }}>✓</div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4" style={{ background: "#0c0c0e" }}>
        <p className="text-xs leading-relaxed" style={{ color: "#a1a1aa", fontFamily: "Figtree, sans-serif" }}>
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

        {/* CTA */}
        <button
          onClick={() => { onClose(); if (cfg.ctaHref) router.push(cfg.ctaHref); }}
          className="w-full font-semibold py-3 rounded-xl transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: cfg.color, color: "#0c0c0e", fontFamily: "Figtree, sans-serif" }}
        >
          {cfg.cta}
        </button>
      </div>
    </div>
  );
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
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [disposition, setDisposition] = useState<DispositionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileError, setFileError] = useState("");
  const [otpCode] = useState(() => Math.floor(100000 + Math.random() * 900000).toString());
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

  const STEPS = ["Reason", "Photos", "Result"];
  const STEP_IDX: Record<Step, number> = { reason: 0, upload: 1, extracting: 1, grading: 1, result: 2 };
  const currentStepIdx = STEP_IDX[step];

  async function handleSubmit() {
    if (!reason) return;
    setLoading(true);

    let gradeData: GradeResult = MOCK_GRADE;
    try {
      const fd = new FormData();

      if (isVideo) {
        setStep("extracting");
        const frames = await extractVideoFrames(mediaFiles[0]);
        setStep("grading");
        if (frames.length > 0) {
          frames.forEach((f, i) => fd.append(`frame${i}`, f));
        }
      } else {
        mediaFiles.forEach((f, i) => fd.append(`frame${i}`, f));
        setStep("grading");
      }

      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 30000);
      const res = await fetch("/api/grade", { method: "POST", body: fd, signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) { const p = await res.json(); if (p?.grade) gradeData = p; }
    } catch {}
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
    setLoading(false);
    setStep("result");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
      <div
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
        style={{ background: "#0c0c0e", border: "1px solid #27272a" }}
      >
        {/* Modal header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4" style={{ background: "#0c0c0e", borderBottom: "1px solid #18181b" }}>
          <div className="flex items-center gap-3">
            {/* Order thumbnail */}
            <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "#18181b" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={order.image} alt={order.product_name} className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight" style={{ color: "#fafafa", fontFamily: "Figtree, sans-serif" }}>Return Request</p>
              <p className="text-xs" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>{order.product_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all hover:opacity-70" style={{ background: "#18181b", color: "#71717a" }}>
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
                    style={{ background: i < currentStepIdx ? "#10b981" : i === currentStepIdx ? "rgba(16,185,129,0.15)" : "#18181b", border: i === currentStepIdx ? "1px solid rgba(16,185,129,0.4)" : "1px solid #27272a", color: i <= currentStepIdx ? "#10b981" : "#52525b", fontFamily: "Figtree, sans-serif" }}>
                    {i < currentStepIdx ? "✓" : i + 1}
                  </div>
                  <span className="text-xs font-medium" style={{ color: i === currentStepIdx ? "#fafafa" : "#52525b", fontFamily: "Figtree, sans-serif" }}>{s}</span>
                </div>
                {i < STEPS.length - 1 && <div className="flex-1 h-px" style={{ background: i < currentStepIdx ? "#10b981" : "#27272a" }} />}
              </div>
            ))}
          </div>

          {/* Step: Reason */}
          {step === "reason" && (
            <div className="space-y-2">
              <p className="font-bold" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>Why are you returning it?</p>
              <p className="text-xs mb-3" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>Return reason is the strongest disposition signal.</p>
              {RETURN_REASONS.map((r) => (
                <button key={r.value}
                  onClick={() => { setReason(r.value); setStep("upload"); }}
                  className="w-full text-left p-3.5 rounded-xl flex items-center gap-3 transition-all"
                  style={{ background: "#111113", border: "1px solid #27272a" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#3f3f46")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#27272a")}
                >
                  <span className="text-lg w-7 text-center">{r.icon}</span>
                  <span className="font-medium text-sm" style={{ color: "#fafafa", fontFamily: "Figtree, sans-serif" }}>{r.label}</span>
                  <span className="ml-auto text-xs" style={{ color: "#52525b" }}>→</span>
                </button>
              ))}
            </div>
          )}

          {/* Step: Upload */}
          {step === "upload" && (
            <div className="space-y-4">
              <p className="font-bold" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>Upload photos</p>

              <div className="rounded-xl p-3" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)" }}>
                <div className="flex items-start gap-2">
                  <span>🔒</span>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "#3b82f6", fontFamily: "Figtree, sans-serif" }}>Fraud Prevention Check</p>
                    <p className="text-xs mt-0.5" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>
                      Include code <span className="font-mono font-bold px-1 rounded" style={{ color: "#fafafa", background: "#27272a" }}>{otpCode}</span> visibly in your photo.
                    </p>
                  </div>
                </div>
              </div>

              {/* Image thumbnails */}
              {!isVideo && mediaFiles.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {mediaFiles.map((f, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden" style={{ background: "#18181b" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={URL.createObjectURL(f)} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeFile(i)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}
                      >✕</button>
                    </div>
                  ))}
                  {mediaFiles.length < 3 && (
                    <label className="aspect-square rounded-xl flex flex-col items-center justify-center cursor-pointer" style={{ border: "2px dashed #3f3f46", background: "#111113" }}>
                      <span className="text-xl mb-1">+</span>
                      <span className="text-xs" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>{3 - mediaFiles.length} left</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files) handleFilesSelect(e.target.files); }} />
                    </label>
                  )}
                </div>
              )}

              {/* Video display */}
              {isVideo && (
                <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: "#111113", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <span className="text-2xl">🎥</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#10b981", fontFamily: "Figtree, sans-serif" }}>{mediaFiles[0].name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>3 frames will be extracted for analysis</p>
                  </div>
                  <button onClick={() => setMediaFiles([])} className="text-xs px-2 py-1 rounded-lg" style={{ background: "#27272a", color: "#71717a" }}>✕</button>
                </div>
              )}

              {/* Upload zone (shown when no files yet) */}
              {!hasFiles && (
                <label className="block cursor-pointer">
                  <div className="rounded-xl p-8 text-center" style={{ border: "2px dashed #27272a", background: "#111113" }}>
                    <p className="text-3xl mb-2">📷</p>
                    <p className="text-sm font-semibold" style={{ color: "#a1a1aa", fontFamily: "Figtree, sans-serif" }}>Click to upload photos or video</p>
                    <p className="text-xs mt-1" style={{ color: "#52525b" }}>Up to 3 photos · or 1 video (max 15 s)</p>
                  </div>
                  <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => { if (e.target.files) handleFilesSelect(e.target.files); }} />
                </label>
              )}

              {fileError && (
                <p className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", fontFamily: "Figtree, sans-serif" }}>
                  ⚠ {fileError}
                </p>
              )}

              <button onClick={handleSubmit} disabled={!hasFiles || loading}
                className="w-full font-semibold py-3 rounded-xl transition-all"
                style={{ background: !hasFiles ? "#18181b" : "#10b981", color: !hasFiles ? "#3f3f46" : "#0c0c0e", fontFamily: "Figtree, sans-serif", cursor: !hasFiles ? "not-allowed" : "pointer", border: !hasFiles ? "1px solid #27272a" : "none" }}>
                {!hasFiles ? "Upload a photo or video to continue" : isVideo ? "Extract Frames & Grade →" : `Submit ${mediaFiles.length} photo${mediaFiles.length > 1 ? "s" : ""} & Grade with AI →`}
              </button>
              <button onClick={() => setStep("reason")} className="w-full text-sm" style={{ color: "#52525b" }}>← Back</button>
            </div>
          )}

          {/* Step: Extracting frames */}
          {step === "extracting" && (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}>🎞️</div>
              <p className="font-bold mb-1" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>Extracting Inspection Frames</p>
              <p className="text-xs mb-2" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>Sampling 3 frames at 25% · 50% · 75% of video</p>
              <p className="text-xs mb-5" style={{ color: "#3b82f6", fontFamily: "Figtree, sans-serif" }}>Each frame analysed separately by Gemini 2.5 Flash</p>
              <div className="flex gap-1.5 justify-center">
                {[0,1,2,3].map((i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "#3b82f6", animation: `bounce 1s ${i * 150}ms infinite` }} />
                ))}
              </div>
            </div>
          )}

          {/* Step: Grading */}
          {step === "grading" && (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>🔍</div>
              <p className="font-bold mb-1" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>AI Grading in Progress</p>
              <p className="text-xs mb-5" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>
                Gemini 2.5 Flash analysing · Computing worst-case grade across frames
              </p>
              <div className="flex gap-1.5 justify-center">
                {[0,1,2,3].map((i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "#10b981", animation: `bounce 1s ${i * 150}ms infinite` }} />
                ))}
              </div>
            </div>
          )}

          {/* Step: Result */}
          {step === "result" && grade && disposition && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-bold" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>Return Decision</p>
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)", fontFamily: "Figtree, sans-serif" }}>AI Complete ✓</span>
              </div>
              <GradeCard grade={grade} />
              <DispositionCard disposition={disposition} productName={order.product_name} mrp={order.mrp} />
              <NextStepPanel disposition={disposition} otpCode={otpCode} onClose={onClose} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
