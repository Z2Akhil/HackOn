import { GradeResult } from "@/types";

const GRADE_REPAIRABILITY: Record<string, number> = { A:95, "A-":85, "B+":70, B:50, C:25 };
const RISK_REPAIRABILITY:  Record<string, number> = { none:100, low:85, medium:60, high:30 };
const CATEGORY_DEMAND:     Record<string, number> = {
  electronics:85, home_appliances:72, accessories:65, apparel:62, home:55, sports:58, beauty:40,
};
const CATEGORY_MATERIAL_RECOVERY: Record<string, number> = {
  electronics:88, home_appliances:78, home:62, accessories:60, sports:52, apparel:32, beauty:22,
};

export function computeCircularityScore(grade: GradeResult, category: string): number {
  const repairability = 0.5 * (GRADE_REPAIRABILITY[grade.grade] ?? 50)
                      + 0.5 * (RISK_REPAIRABILITY[grade.functional_risk] ?? 50);
  const demand        = CATEGORY_DEMAND[category] ?? 55;
  const lifespan      = repairability * 0.9;
  const material      = CATEGORY_MATERIAL_RECOVERY[category] ?? 55;
  const defect_penalty = Math.min(grade.defects.length * 3, 20);

  return Math.max(0, Math.round(
    0.30 * repairability +
    0.25 * demand +
    0.25 * lifespan +
    0.20 * material -
    defect_penalty
  ));
}
