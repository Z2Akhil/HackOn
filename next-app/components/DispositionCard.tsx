import { DispositionResult } from "@/types";
import Link from "next/link";
import { AZ, CHANNEL_COLOR } from "@/lib/ui-theme";
import {
  ShoppingCart, Wrench, HeartHandshake, Recycle, RefreshCw,
  Leaf, AlertTriangle, ArrowRight, type LucideIcon,
} from "lucide-react";

const DECISION_CONFIG: Record<string, { Icon: LucideIcon; label: string }> = {
  resell:   { Icon: ShoppingCart,  label: "Resell as Open-Box" },
  refurbish:{ Icon: Wrench,        label: "Refurbish" },
  donate:   { Icon: HeartHandshake,label: "Donate to Charity" },
  recycle:  { Icon: Recycle,       label: "Recycle for Raw Material" },
  exchange: { Icon: RefreshCw,     label: "Exchange for Correct Variant" },
};

const SCORE_DIM_LABELS: Record<string, string> = {
  economic: "Economic", sustainability: "Sustainability", trust: "Trust",
};
const SCORE_DIM_COLORS: Record<string, string> = {
  economic: AZ.blue, sustainability: AZ.green, trust: "#8b5cf6",
};

function CircularityRing({ score }: { score: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 75 ? AZ.green : score >= 50 ? AZ.amber : AZ.red;
  return (
    <div className="relative flex items-center justify-center" style={{ width: 72, height: 72 }}>
      <svg width="72" height="72" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="36" cy="36" r={r} fill="none" stroke={AZ.border} strokeWidth="5" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-black" style={{ color, fontFamily: "Syne, sans-serif" }}>{score}</span>
        <span className="text-xs leading-none" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>/100</span>
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
  const DecisionIcon = cfg.Icon;
  const cfgColor = CHANNEL_COLOR[disposition.decision] ?? AZ.green;
  const cfgBg = `${cfgColor}14`;
  const cfgBorder = `${cfgColor}33`;
  const evEntries = (Object.entries(disposition.ev_table) as [string, number][])
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);
  const maxEV = Math.max(...evEntries.map(([, v]) => v), 1);
  const recoveryPct = Math.round((disposition.estimated_recovery / mrp) * 100);
  const winnerBreakdown = disposition.score_breakdown?.[disposition.decision];

  return (
    <div className="rounded-2xl overflow-hidden animate-fade-up delay-1" style={{ border: `1px solid ${AZ.border}`, background: AZ.card }}>
      {/* Decision header */}
      <div className="p-5" style={{ background: cfgBg, borderBottom: `1px solid ${cfgBorder}` }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: cfgColor, fontFamily: "Figtree, sans-serif" }}>
              AI Disposition Decision
            </p>
            <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: AZ.ink, fontFamily: "Syne, sans-serif" }}>
              <DecisionIcon size={22} color={cfgColor} /> {cfg.label}
            </h3>
          </div>
          <div className="text-right">
            {(() => {
              const d = disposition.decision;
              if (d === "donate") return (
                <>
                  <p className="text-xs" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>Est. tax benefit</p>
                  <p className="text-2xl font-black" style={{ color: cfgColor, fontFamily: "Syne, sans-serif" }}>₹{disposition.estimated_recovery.toLocaleString("en-IN")}</p>
                  <p className="text-xs" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>80G deduction value</p>
                </>
              );
              if (d === "recycle") return (
                <>
                  <p className="text-xs" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>Material salvage</p>
                  <p className="text-2xl font-black" style={{ color: cfgColor, fontFamily: "Syne, sans-serif" }}>₹{disposition.estimated_recovery.toLocaleString("en-IN")}</p>
                  <p className="text-xs" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>from recycler</p>
                </>
              );
              return (
                <>
                  <p className="text-xs" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>Estimated recovery</p>
                  <p className="text-2xl font-black" style={{ color: cfgColor, fontFamily: "Syne, sans-serif" }}>₹{disposition.estimated_recovery.toLocaleString("en-IN")}</p>
                  <p className="text-xs" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>{recoveryPct}% of MRP</p>
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
            <div className="flex-1 rounded-xl p-3 flex items-center gap-3" style={{ background: AZ.surfaceAlt, border: `1px solid ${AZ.border}` }}>
              <CircularityRing score={disposition.circularity_score} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>Circularity</p>
                <p className="text-sm font-bold mt-0.5" style={{ color: AZ.ink, fontFamily: "Syne, sans-serif" }}>
                  {disposition.circularity_score >= 75 ? "High" : disposition.circularity_score >= 50 ? "Medium" : "Low"} potential
                </p>
                <p className="text-xs" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>second-life index</p>
              </div>
            </div>
          )}
          {disposition.co2_saved_kg != null && (
            <div className="flex-1 rounded-xl p-3 flex flex-col justify-center items-center text-center" style={{ background: AZ.greenBg, border: `1px solid ${AZ.green}26` }}>
              <p className="text-2xl font-black" style={{ color: AZ.green, fontFamily: "Syne, sans-serif" }}>{disposition.co2_saved_kg}kg</p>
              <p className="text-xs mt-0.5" style={{ color: AZ.green, fontFamily: "Figtree, sans-serif" }}>CO₂ saved</p>
              <p className="text-xs" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>vs. manufacturing new</p>
            </div>
          )}
        </div>

        {/* Multi-objective score breakdown */}
        {winnerBreakdown && (
          <div className="rounded-xl p-4" style={{ background: AZ.surfaceAlt, border: `1px solid ${AZ.border}` }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
              Multi-Objective Score — 50% Economic · 30% Sustainability · 20% Trust
            </p>
            <div className="space-y-2">
              {(["economic", "sustainability", "trust"] as const).map((dim) => {
                const val = winnerBreakdown[dim] ?? 0;
                return (
                  <div key={dim} className="flex items-center gap-2">
                    <div className="w-24 text-xs font-medium capitalize" style={{ color: SCORE_DIM_COLORS[dim], fontFamily: "Figtree, sans-serif" }}>
                      {SCORE_DIM_LABELS[dim]}
                    </div>
                    <div className="flex-1 h-1.5 rounded-full" style={{ background: AZ.border }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.round(val * 100)}%`, background: SCORE_DIM_COLORS[dim] }} />
                    </div>
                    <div className="text-xs font-mono" style={{ color: AZ.ink2, minWidth: 36 }}>{Math.round(val * 100)}%</div>
                  </div>
                );
              })}
              <div className="mt-2 pt-2 flex items-center justify-between" style={{ borderTop: `1px solid ${AZ.border}` }}>
                <span className="text-xs font-semibold" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>Final score</span>
                <span className="text-sm font-black" style={{ color: cfgColor, fontFamily: "Syne, sans-serif" }}>
                  {Math.round((winnerBreakdown.final ?? 0) * 100)}/100
                </span>
              </div>
            </div>
          </div>
        )}

        {/* EV table */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
            Expected Value by Channel
          </p>
          <div className="space-y-2.5">
            {evEntries.map(([channel, ev], idx) => {
              const isWinner = channel === disposition.decision;
              const barWidth = Math.max(4, (ev / maxEV) * 100);
              return (
                <div key={channel} className="flex items-center gap-3">
                  <div className="w-20 text-xs font-semibold capitalize" style={{ color: isWinner ? AZ.ink : AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
                    {channel}
                  </div>
                  <div className="flex-1 rounded-full h-5 overflow-hidden relative" style={{ background: AZ.surfaceAlt }}>
                    <div
                      className="h-full rounded-full ev-bar flex items-center px-2"
                      style={{ width: `${barWidth}%`, background: isWinner ? (CHANNEL_COLOR[channel] ?? AZ.green) : AZ.border, animationDelay: `${idx * 80}ms` }}
                    >
                      {barWidth > 20 && (
                        <span className="text-xs font-bold text-white whitespace-nowrap">₹{ev.toLocaleString("en-IN")}</span>
                      )}
                    </div>
                    {barWidth <= 20 && (
                      <span className="absolute right-2 top-0 h-full flex items-center text-xs font-medium" style={{ color: AZ.ink2 }}>
                        ₹{ev.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                  {isWinner && (
                    <div className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: cfgBg, color: cfgColor, border: `1px solid ${cfgBorder}` }}>
                      BEST
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Reasoning */}
        <div className="rounded-xl p-4" style={{ background: AZ.surfaceAlt, border: `1px solid ${AZ.border}` }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
            AI Reasoning (Gemini 2.5 Flash)
          </p>
          <p className="text-sm leading-relaxed" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
            {disposition.reasoning_text}
          </p>
        </div>

        {/* Credits + flag */}
        <div className="flex gap-3">
          <div className="flex-1 rounded-xl p-3 text-center" style={{ background: AZ.greenBg, border: `1px solid ${AZ.green}26` }}>
            <p className="text-xl font-black" style={{ color: AZ.green, fontFamily: "Syne, sans-serif" }}>+{disposition.green_credits}</p>
            <p className="text-xs mt-0.5 flex items-center justify-center gap-1" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
              <Leaf size={12} color={AZ.green} /> Green Credits
            </p>
          </div>
          {disposition.listing_flagged && (
            <div className="flex-1 rounded-xl p-3 text-center flex flex-col items-center justify-center" style={{ background: AZ.amberBg, border: `1px solid ${AZ.amber}33` }}>
              <AlertTriangle size={20} color={AZ.amber} />
              <p className="text-xs mt-0.5" style={{ color: AZ.amber, fontFamily: "Figtree, sans-serif" }}>Listing Flagged</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {disposition.decision === "resell" && (
            <Link
              href="/marketplace"
              className="flex-1 flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: AZ.ctaYellow, border: `1px solid ${AZ.ctaYellowBorder}`, color: AZ.ink, fontFamily: "Figtree, sans-serif" }}
            >
              View in Marketplace <ArrowRight size={16} />
            </Link>
          )}
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
            style={{ background: AZ.card, color: AZ.ink2, border: `1px solid ${AZ.border}`, fontFamily: "Figtree, sans-serif" }}
          >
            Ops Dashboard <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
