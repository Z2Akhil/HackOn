import { DispositionResult } from "@/types";
import Link from "next/link";

const DECISION_CONFIG: Record<string, { emoji: string; label: string; color: string; bg: string; border: string }> = {
  resell:   { emoji: "🛒", label: "Resell as Open-Box",           color: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.2)" },
  refurbish:{ emoji: "🔧", label: "Refurbish",                    color: "#3b82f6", bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.2)" },
  donate:   { emoji: "🤝", label: "Donate to Charity",            color: "#8b5cf6", bg: "rgba(139,92,246,0.08)",  border: "rgba(139,92,246,0.2)" },
  recycle:  { emoji: "♻️", label: "Recycle for Raw Material",     color: "#22c55e", bg: "rgba(34,197,94,0.08)",   border: "rgba(34,197,94,0.2)" },
  exchange: { emoji: "🔄", label: "Exchange for Correct Variant", color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)" },
};

const CHANNEL_COLORS: Record<string, string> = {
  resell: "#10b981", refurbish: "#3b82f6", donate: "#8b5cf6", recycle: "#22c55e", exchange: "#f59e0b",
};

const SCORE_DIM_LABELS: Record<string, string> = {
  economic: "Economic", sustainability: "Sustainability", trust: "Trust",
};
const SCORE_DIM_COLORS: Record<string, string> = {
  economic: "#3b82f6", sustainability: "#10b981", trust: "#8b5cf6",
};

function CircularityRing({ score }: { score: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative flex items-center justify-center" style={{ width: 72, height: 72 }}>
      <svg width="72" height="72" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="36" cy="36" r={r} fill="none" stroke="#27272a" strokeWidth="5" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-black" style={{ color, fontFamily: "Syne, sans-serif" }}>{score}</span>
        <span className="text-xs leading-none" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>/100</span>
      </div>
    </div>
  );
}

export default function DispositionCard({
  disposition, productName, mrp,
}: {
  disposition: DispositionResult; productName: string; mrp: number;
}) {
  const cfg = DECISION_CONFIG[disposition.decision] ?? DECISION_CONFIG["resell"];
  const evEntries = (Object.entries(disposition.ev_table) as [string, number][])
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);
  const maxEV = Math.max(...evEntries.map(([, v]) => v), 1);
  const recoveryPct = Math.round((disposition.estimated_recovery / mrp) * 100);
  const winnerBreakdown = disposition.score_breakdown?.[disposition.decision];

  return (
    <div className="rounded-2xl overflow-hidden animate-fade-up delay-1" style={{ border: "1px solid #27272a", background: "#111113" }}>
      {/* Decision header */}
      <div className="p-5" style={{ background: cfg.bg, borderBottom: `1px solid ${cfg.border}` }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: cfg.color, fontFamily: "Figtree, sans-serif" }}>
              AI Disposition Decision
            </p>
            <h3 className="text-xl font-bold" style={{ color: "#fafafa", fontFamily: "Syne, sans-serif" }}>
              {cfg.emoji} {cfg.label}
            </h3>
          </div>
          <div className="text-right">
            {(() => {
              const d = disposition.decision;
              if (d === "donate") return (
                <>
                  <p className="text-xs" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>Est. tax benefit</p>
                  <p className="text-2xl font-black" style={{ color: cfg.color, fontFamily: "Syne, sans-serif" }}>₹{disposition.estimated_recovery.toLocaleString("en-IN")}</p>
                  <p className="text-xs" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>80G deduction value</p>
                </>
              );
              if (d === "recycle") return (
                <>
                  <p className="text-xs" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>Material salvage</p>
                  <p className="text-2xl font-black" style={{ color: cfg.color, fontFamily: "Syne, sans-serif" }}>₹{disposition.estimated_recovery.toLocaleString("en-IN")}</p>
                  <p className="text-xs" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>from recycler</p>
                </>
              );
              return (
                <>
                  <p className="text-xs" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>Estimated recovery</p>
                  <p className="text-2xl font-black" style={{ color: cfg.color, fontFamily: "Syne, sans-serif" }}>₹{disposition.estimated_recovery.toLocaleString("en-IN")}</p>
                  <p className="text-xs" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>{recoveryPct}% of MRP</p>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Circularity + CO2 row */}
        <div className="flex gap-3">
          {disposition.circularity_score != null && (
            <div className="flex-1 rounded-xl p-3 flex items-center gap-3" style={{ background: "#18181b", border: "1px solid #27272a" }}>
              <CircularityRing score={disposition.circularity_score} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>Circularity</p>
                <p className="text-sm font-bold mt-0.5" style={{ color: "#fafafa", fontFamily: "Syne, sans-serif" }}>
                  {disposition.circularity_score >= 75 ? "High" : disposition.circularity_score >= 50 ? "Medium" : "Low"} potential
                </p>
                <p className="text-xs" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>second-life index</p>
              </div>
            </div>
          )}
          {disposition.co2_saved_kg != null && (
            <div className="flex-1 rounded-xl p-3 flex flex-col justify-center items-center text-center" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
              <p className="text-2xl font-black" style={{ color: "#10b981", fontFamily: "Syne, sans-serif" }}>{disposition.co2_saved_kg}kg</p>
              <p className="text-xs mt-0.5" style={{ color: "#10b981", fontFamily: "Figtree, sans-serif" }}>CO₂ saved</p>
              <p className="text-xs" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>vs. manufacturing new</p>
            </div>
          )}
        </div>

        {/* Multi-objective score breakdown */}
        {winnerBreakdown && (
          <div className="rounded-xl p-4" style={{ background: "#18181b", border: "1px solid #27272a" }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>
              Multi-Objective Score — 50% Economic · 30% Sustainability · 20% Trust
            </p>
            <div className="space-y-2">
              {(["economic", "sustainability", "trust"] as const).map((dim) => {
                const val = winnerBreakdown[dim] ?? 0;
                const weights: Record<string, number> = { economic: 0.5, sustainability: 0.3, trust: 0.2 };
                const weighted = val * weights[dim];
                return (
                  <div key={dim} className="flex items-center gap-2">
                    <div className="w-24 text-xs font-medium capitalize" style={{ color: SCORE_DIM_COLORS[dim], fontFamily: "Figtree, sans-serif" }}>
                      {SCORE_DIM_LABELS[dim]}
                    </div>
                    <div className="flex-1 h-1.5 rounded-full" style={{ background: "#27272a" }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.round(val * 100)}%`, background: SCORE_DIM_COLORS[dim] }} />
                    </div>
                    <div className="text-xs font-mono" style={{ color: "#71717a", minWidth: 36 }}>{Math.round(val * 100)}%</div>
                  </div>
                );
              })}
              <div className="mt-2 pt-2 flex items-center justify-between" style={{ borderTop: "1px solid #27272a" }}>
                <span className="text-xs font-semibold" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>Final score</span>
                <span className="text-sm font-black" style={{ color: cfg.color, fontFamily: "Syne, sans-serif" }}>
                  {Math.round((winnerBreakdown.final ?? 0) * 100)}/100
                </span>
              </div>
            </div>
          </div>
        )}

        {/* EV table */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>
            Expected Value by Channel
          </p>
          <div className="space-y-2.5">
            {evEntries.map(([channel, ev], idx) => {
              const isWinner = channel === disposition.decision;
              const barWidth = Math.max(4, (ev / maxEV) * 100);
              return (
                <div key={channel} className="flex items-center gap-3">
                  <div className="w-20 text-xs font-semibold capitalize" style={{ color: isWinner ? "#fafafa" : "#52525b", fontFamily: "Figtree, sans-serif" }}>
                    {channel}
                  </div>
                  <div className="flex-1 rounded-full h-5 overflow-hidden relative" style={{ background: "#18181b" }}>
                    <div
                      className="h-full rounded-full ev-bar flex items-center px-2"
                      style={{ width: `${barWidth}%`, background: isWinner ? CHANNEL_COLORS[channel] : "#27272a", animationDelay: `${idx * 80}ms` }}
                    >
                      {barWidth > 20 && (
                        <span className="text-xs font-bold text-white whitespace-nowrap">₹{ev.toLocaleString("en-IN")}</span>
                      )}
                    </div>
                    {barWidth <= 20 && (
                      <span className="absolute right-2 top-0 h-full flex items-center text-xs font-medium" style={{ color: "#52525b" }}>
                        ₹{ev.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                  {isWinner && (
                    <div className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                      BEST
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Reasoning */}
        <div className="rounded-xl p-4" style={{ background: "#18181b", border: "1px solid #27272a" }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>
            AI Reasoning (Gemini 2.5 Flash)
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "#a1a1aa", fontFamily: "Figtree, sans-serif" }}>
            {disposition.reasoning_text}
          </p>
        </div>

        {/* Credits + flag */}
        <div className="flex gap-3">
          <div className="flex-1 rounded-xl p-3 text-center" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
            <p className="text-xl font-black" style={{ color: "#10b981", fontFamily: "Syne, sans-serif" }}>+{disposition.green_credits}</p>
            <p className="text-xs mt-0.5" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>🌿 Green Credits</p>
          </div>
          {disposition.listing_flagged && (
            <div className="flex-1 rounded-xl p-3 text-center" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <p className="text-xl">⚠️</p>
              <p className="text-xs mt-0.5" style={{ color: "#f59e0b", fontFamily: "Figtree, sans-serif" }}>Listing Flagged</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {disposition.decision === "resell" && (
            <Link
              href="/marketplace"
              className="flex-1 flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: "#10b981", color: "#0c0c0e", fontFamily: "Figtree, sans-serif" }}
            >
              View in Marketplace →
            </Link>
          )}
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
            style={{ background: "#111113", color: "#52525b", border: "1px solid #27272a", fontFamily: "Figtree, sans-serif" }}
          >
            Ops Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
