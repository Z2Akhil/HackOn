import { GradeResult } from "@/types";
import { AZ, CONDITION } from "@/lib/ui-theme";
import { Check, X } from "lucide-react";

const RISK_COLOR: Record<string, string> = {
  none: AZ.green, low: AZ.green, medium: AZ.amber, high: AZ.red,
};

export default function GradeCard({ grade }: { grade: GradeResult }) {
  const cfg = CONDITION[grade.grade] ?? CONDITION["B"];
  const confidencePct = Math.round(grade.confidence * 100);

  return (
    <div className="rounded-2xl overflow-hidden animate-fade-up" style={{ border: `1px solid ${AZ.border}`, background: AZ.card }}>
      {/* Grade header band */}
      <div className="p-5" style={{ background: cfg.bg, borderBottom: `1px solid ${cfg.color}33` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl font-black" style={{ background: AZ.card, border: `2px solid ${cfg.color}`, color: cfg.color, fontFamily: "Syne, sans-serif" }}>
              {grade.grade}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: cfg.color, fontFamily: "Figtree, sans-serif" }}>
                AI Condition Grade
              </p>
              <p className="text-lg font-bold" style={{ color: AZ.ink, fontFamily: "Syne, sans-serif" }}>{cfg.short}</p>
              <p className="text-xs mt-0.5" style={{ color: RISK_COLOR[grade.functional_risk], fontFamily: "Figtree, sans-serif" }}>
                {grade.functional_risk.charAt(0).toUpperCase() + grade.functional_risk.slice(1)} functional risk
              </p>
            </div>
          </div>

          {/* Confidence radial */}
          <div className="text-center">
            <div className="text-2xl font-black" style={{ color: cfg.color, fontFamily: "Syne, sans-serif" }}>{confidencePct}%</div>
            <div className="text-xs" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>confidence</div>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="p-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>Defects</p>
          {grade.defects.length === 0 ? (
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: AZ.green }} />
              <span className="text-sm font-medium" style={{ color: AZ.green, fontFamily: "Figtree, sans-serif" }}>None detected</span>
            </div>
          ) : (
            <ul className="space-y-1">
              {grade.defects.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
                  <span style={{ color: AZ.amber, marginTop: "2px" }}>·</span> {d}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>Packaging</p>
            <p className="text-sm font-medium capitalize" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
              {grade.packaging_status.replace(/_/g, " ")}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>Accessories</p>
            <p className="text-sm font-medium flex items-center gap-1" style={{ color: grade.accessories_complete ? AZ.green : AZ.red, fontFamily: "Figtree, sans-serif" }}>
              {grade.accessories_complete ? <Check size={14} /> : <X size={14} />}
              {grade.accessories_complete ? "Complete" : "Incomplete"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
