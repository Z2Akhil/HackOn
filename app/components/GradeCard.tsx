import { GradeResult } from "@/types";

const GRADE_CONFIG: Record<string, { color: string; bg: string; border: string; label: string; dot: string }> = {
  "A":  { color: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.25)",  label: "Like New",        dot: "#10b981" },
  "A-": { color: "#34d399", bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.25)",  label: "Minor Cosmetic",  dot: "#34d399" },
  "B+": { color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.25)",  label: "Moderate Wear",   dot: "#f59e0b" },
  "B":  { color: "#f97316", bg: "rgba(249,115,22,0.08)",  border: "rgba(249,115,22,0.25)",  label: "Heavy Wear",      dot: "#f97316" },
  "C":  { color: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.25)",   label: "Poor Condition",  dot: "#ef4444" },
};

const RISK_COLOR: Record<string, string> = {
  none: "#10b981", low: "#34d399", medium: "#f59e0b", high: "#ef4444",
};

export default function GradeCard({ grade }: { grade: GradeResult }) {
  const cfg = GRADE_CONFIG[grade.grade] ?? GRADE_CONFIG["B"];
  const confidencePct = Math.round(grade.confidence * 100);

  return (
    <div className="rounded-2xl overflow-hidden animate-fade-up" style={{ border: "1px solid #27272a", background: "#111113" }}>
      {/* Grade header band */}
      <div className="p-5" style={{ background: cfg.bg, borderBottom: `1px solid ${cfg.border}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl font-black" style={{ background: cfg.bg, border: `2px solid ${cfg.border}`, color: cfg.color, fontFamily: "Syne, sans-serif" }}>
              {grade.grade}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: cfg.color, fontFamily: "Figtree, sans-serif" }}>
                AI Condition Grade
              </p>
              <p className="text-lg font-bold" style={{ color: "#fafafa", fontFamily: "Syne, sans-serif" }}>{cfg.label}</p>
              <p className="text-xs mt-0.5" style={{ color: RISK_COLOR[grade.functional_risk], fontFamily: "Figtree, sans-serif" }}>
                {grade.functional_risk.charAt(0).toUpperCase() + grade.functional_risk.slice(1)} functional risk
              </p>
            </div>
          </div>

          {/* Confidence radial */}
          <div className="text-center">
            <div className="text-2xl font-black" style={{ color: cfg.color, fontFamily: "Syne, sans-serif" }}>{confidencePct}%</div>
            <div className="text-xs" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>confidence</div>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="p-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>Defects</p>
          {grade.defects.length === 0 ? (
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#10b981" }} />
              <span className="text-sm font-medium" style={{ color: "#10b981", fontFamily: "Figtree, sans-serif" }}>None detected</span>
            </div>
          ) : (
            <ul className="space-y-1">
              {grade.defects.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#a1a1aa", fontFamily: "Figtree, sans-serif" }}>
                  <span style={{ color: "#f59e0b", marginTop: "2px" }}>·</span> {d}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>Packaging</p>
            <p className="text-sm font-medium capitalize" style={{ color: "#a1a1aa", fontFamily: "Figtree, sans-serif" }}>
              {grade.packaging_status.replace(/_/g, " ")}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>Accessories</p>
            <p className="text-sm font-medium" style={{ color: grade.accessories_complete ? "#10b981" : "#ef4444", fontFamily: "Figtree, sans-serif" }}>
              {grade.accessories_complete ? "✓ Complete" : "✗ Incomplete"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
