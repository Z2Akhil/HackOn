"use client";
import { useState } from "react";
import { GradeResult, DispositionResult } from "@/types";
import GradeCard from "@/components/GradeCard";
import DispositionCard from "@/components/DispositionCard";
import ReturnNudgeBanner from "@/components/ReturnNudgeBanner";

const DEMO_ORDERS = [
  { id: "o001", product_id: "p003", product_name: "Bajaj Mixer Grinder 750W", category: "home_appliances", mrp: 3499, ordered: "2026-05-18", emoji: "🏠" },
  { id: "o002", product_id: "p001", product_name: "Sony WH-1000XM5 Headphones", category: "electronics", mrp: 29990, ordered: "2026-05-22", emoji: "📱" },
  { id: "o003", product_id: "p004", product_name: "Levis 511 Slim Fit Jeans", category: "apparel", mrp: 4999, ordered: "2026-06-01", emoji: "👕" },
  { id: "o004", product_id: "p009", product_name: "Bombay Dyeing Double Bedsheet Set", category: "home", mrp: 1499, ordered: "2026-06-05", emoji: "🛋️" },
];

const RETURN_REASONS = [
  { value: "defective", label: "Defective / Not working", icon: "⚡" },
  { value: "wrong_size", label: "Wrong size / Doesn't fit", icon: "📏" },
  { value: "not_as_described", label: "Not as described", icon: "📋" },
  { value: "changed_mind", label: "Changed my mind", icon: "💭" },
  { value: "wrong_variant", label: "Wrong variant / colour", icon: "🎨" },
];

const STEPS = ["Order", "Reason", "Photos", "Result"];
type Step = "select" | "reason" | "upload" | "grading" | "result";
const STEP_IDX: Record<Step, number> = { select: 0, reason: 1, upload: 2, grading: 2, result: 3 };

export default function ReturnPage() {
  const [step, setStep] = useState<Step>("select");
  const [selectedOrder, setSelectedOrder] = useState<typeof DEMO_ORDERS[0] | null>(null);
  const [reason, setReason] = useState("");
  const [otpCode] = useState(() => Math.floor(100000 + Math.random() * 900000).toString());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [disposition, setDisposition] = useState<DispositionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmitPhotos() {
    if (!selectedOrder || !reason) return;
    setLoading(true); setError("");
    setStep("grading");

    try {
      const fd = new FormData();
      if (imageFile) fd.append("image", imageFile);
      else fd.append("mock", "default");

      const gradeRes = await fetch("/api/grade", { method: "POST", body: fd });
      const gradeData: GradeResult = await gradeRes.json();
      setGrade(gradeData);

      const dispRes = await fetch("/api/disposition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: gradeData, product_id: selectedOrder.product_id,
          product_name: selectedOrder.product_name, category: selectedOrder.category,
          mrp: selectedOrder.mrp, return_reason: reason,
        }),
      });
      const dispData: DispositionResult = await dispRes.json();
      setDisposition(dispData);
      setStep("result");
    } catch {
      setError("Something went wrong. Please try again.");
      setStep("upload");
    } finally {
      setLoading(false);
    }
  }

  const currentStepIdx = STEP_IDX[step];

  return (
    <div className="max-w-xl mx-auto px-5 py-10">
      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>Return an Item</h1>
        <p className="text-sm mt-1" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>
          AI grades your item and finds its next best owner — with full transparency.
        </p>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-2 mb-8 animate-fade-up delay-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  background: i < currentStepIdx ? "#10b981" : i === currentStepIdx ? "rgba(16,185,129,0.15)" : "#18181b",
                  border: i === currentStepIdx ? "1px solid rgba(16,185,129,0.4)" : "1px solid #27272a",
                  color: i <= currentStepIdx ? "#10b981" : "#52525b",
                  fontFamily: "Figtree, sans-serif",
                }}
              >
                {i < currentStepIdx ? "✓" : i + 1}
              </div>
              <span className="text-xs font-medium hidden sm:block" style={{ color: i === currentStepIdx ? "#fafafa" : "#52525b", fontFamily: "Figtree, sans-serif" }}>
                {s}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px" style={{ background: i < currentStepIdx ? "#10b981" : "#27272a" }} />
            )}
          </div>
        ))}
      </div>

      {/* Step: Select order */}
      {step === "select" && (
        <div className="space-y-3 animate-fade-up">
          <h2 className="font-bold text-lg mb-4" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>Select item to return</h2>
          {DEMO_ORDERS.map((order) => (
            <button
              key={order.id}
              onClick={() => { setSelectedOrder(order); setStep("reason"); }}
              className="w-full text-left p-4 rounded-xl transition-all group"
              style={{ background: "#111113", border: "1px solid #27272a" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "#3f3f46")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#27272a")}
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#18181b" }}>
                  {order.emoji}
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: "#fafafa", fontFamily: "Figtree, sans-serif" }}>{order.product_name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>
                    ₹{order.mrp.toLocaleString("en-IN")} · Ordered {order.ordered}
                  </p>
                </div>
                <div className="ml-auto text-sm" style={{ color: "#52525b" }}>→</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Step: Reason */}
      {step === "reason" && selectedOrder && (
        <div className="space-y-3 animate-fade-up">
          <h2 className="font-bold text-lg mb-1" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>Why are you returning it?</h2>
          <p className="text-sm mb-4" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>
            Return reason is the strongest disposition signal.
          </p>
          {RETURN_REASONS.map((r) => (
            <button
              key={r.value}
              onClick={() => { setReason(r.value); setStep("upload"); }}
              className="w-full text-left p-4 rounded-xl transition-all flex items-center gap-3"
              style={{ background: "#111113", border: "1px solid #27272a" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "#3f3f46")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#27272a")}
            >
              <span className="text-xl w-8 text-center">{r.icon}</span>
              <span className="font-medium text-sm" style={{ color: "#fafafa", fontFamily: "Figtree, sans-serif" }}>{r.label}</span>
              <span className="ml-auto" style={{ color: "#52525b" }}>→</span>
            </button>
          ))}
          <button onClick={() => setStep("select")} className="text-sm mt-2" style={{ color: "#52525b" }}>← Back</button>
        </div>
      )}

      {/* Step: Upload */}
      {step === "upload" && selectedOrder && (
        <div className="space-y-5 animate-fade-up">
          <h2 className="font-bold text-lg" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>Upload photos</h2>

          {reason && <ReturnNudgeBanner reason={reason} />}

          {/* OTP fraud check */}
          <div className="rounded-xl p-4" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)" }}>
            <div className="flex items-start gap-3">
              <span className="text-lg">🔒</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#3b82f6", fontFamily: "Figtree, sans-serif" }}>Fraud Prevention Check</p>
                <p className="text-xs mt-1" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>
                  Write code{" "}
                  <span className="font-mono font-bold px-1.5 py-0.5 rounded" style={{ color: "#fafafa", background: "#27272a" }}>
                    {otpCode}
                  </span>{" "}
                  on paper and include it visibly in your photo.
                </p>
              </div>
            </div>
          </div>

          {/* Upload zone */}
          <label className="block cursor-pointer">
            <div
              className="rounded-xl p-10 text-center transition-all"
              style={{ border: "2px dashed #27272a", background: "#111113" }}
            >
              {imageFile ? (
                <div>
                  <p className="text-2xl mb-2">✓</p>
                  <p className="font-medium text-sm" style={{ color: "#10b981", fontFamily: "Figtree, sans-serif" }}>{imageFile.name}</p>
                </div>
              ) : (
                <div>
                  <p className="text-4xl mb-3">📷</p>
                  <p className="font-semibold text-sm" style={{ color: "#a1a1aa", fontFamily: "Figtree, sans-serif" }}>Click to upload photo</p>
                  <p className="text-xs mt-1" style={{ color: "#52525b" }}>Leave blank to use demo mode</p>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
          </label>

          {error && <p className="text-sm" style={{ color: "#ef4444", fontFamily: "Figtree, sans-serif" }}>{error}</p>}

          <button
            onClick={handleSubmitPhotos}
            disabled={loading}
            className="w-full font-semibold py-3.5 rounded-xl transition-all"
            style={{ background: loading ? "#27272a" : "#10b981", color: loading ? "#52525b" : "#0c0c0e", fontFamily: "Figtree, sans-serif" }}
          >
            {loading ? "Analysing with AI…" : "Submit Return →"}
          </button>
        </div>
      )}

      {/* Step: Grading in progress */}
      {step === "grading" && (
        <div className="text-center py-16 animate-fade-in">
          <div className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center text-4xl" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
            🔍
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>AI Grading in Progress</h2>
          <p className="text-sm mb-6" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>
            Running vision analysis · Computing EV across 5 channels
          </p>
          <div className="flex gap-1.5 justify-center">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "#10b981", animation: `bounce 1s ${i * 150}ms infinite` }} />
            ))}
          </div>
        </div>
      )}

      {/* Step: Result */}
      {step === "result" && grade && disposition && selectedOrder && (
        <div className="space-y-4 animate-fade-up">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-lg" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>Return Decision</h2>
            <div className="text-xs px-2 py-1 rounded" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)", fontFamily: "Figtree, sans-serif" }}>
              AI Complete ✓
            </div>
          </div>
          <GradeCard grade={grade} />
          <DispositionCard disposition={disposition} productName={selectedOrder.product_name} mrp={selectedOrder.mrp} />
          <button
            onClick={() => { setStep("select"); setSelectedOrder(null); setReason(""); setGrade(null); setDisposition(null); setImageFile(null); }}
            className="w-full py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: "#111113", color: "#52525b", border: "1px solid #27272a", fontFamily: "Figtree, sans-serif" }}
          >
            Return another item
          </button>
        </div>
      )}
    </div>
  );
}
