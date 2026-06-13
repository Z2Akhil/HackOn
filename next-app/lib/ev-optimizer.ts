import { GradeResult, EVTable, DispositionResult, ScoreBreakdown } from "@/types";
import { getResaleReference } from "./data";
import { computeCircularityScore } from "./circularity";

const LOGISTICS_COST_PCT  = 0.05;
const RELISTING_COST_PCT  = 0.03;
const CSR_VALUE_PCT       = 0.08;
const TAX_BENEFIT_PCT     = 0.04;
const SALVAGE_MATERIAL_PCT = 0.10;
const RECYCLE_PROCESS_PCT = 0.02;

// Multi-objective weights
const W_ECONOMIC     = 0.5;
const W_SUSTAINABILITY = 0.3;
const W_TRUST        = 0.2;

// Sustainability score per channel (0–1): how circular/green is the outcome
const SUSTAINABILITY_SCORES: Record<string, number> = {
  donate:   1.00,
  recycle:  0.85,
  refurbish:0.75,
  resell:   0.70,
  exchange: 0.65,
};

// Customer trust score per channel (0–1): how confident is the next owner
const TRUST_SCORES: Record<string, number> = {
  resell:   0.90,
  exchange: 0.80,
  refurbish:0.70,
  donate:   0.60,
  recycle:  0.30,
};

const GREEN_CREDITS_MAP: Record<string, number> = {
  donate: 80, recycle: 60, refurbish: 40, resell: 50, exchange: 30,
};

// CO₂ saved vs. manufacturing new (kg)
const CO2_SAVED_KG: Record<string, number> = {
  resell:   14.2,
  refurbish: 8.5,
  donate:    5.8,
  recycle:   3.1,
  exchange: 11.0,
};

export function computeEV(
  grade: GradeResult,
  category: string,
  mrp: number,
  return_reason: string
): DispositionResult {
  const ref    = getResaleReference();
  const catRef = ref[category] ?? ref["electronics"];
  const gradeRef = catRef[grade.grade] ?? catRef["B"];

  const logistics = mrp * LOGISTICS_COST_PCT;

  // ── Raw EV per channel ────────────────────────────────────────────────────
  const resale_price = mrp * gradeRef.expected_resale_pct_of_mrp;
  const ev_resell =
    gradeRef.sell_through_prob * resale_price -
    mrp * RELISTING_COST_PCT - logistics;

  const refurb_cost    = mrp * gradeRef.refurb_cost_pct;
  const refurb_grade   = downgradeGrade(grade.grade);
  const refurb_ref     = catRef[refurb_grade] ?? gradeRef;
  const refurb_resale  = mrp * refurb_ref.expected_resale_pct_of_mrp;
  const repair_ok_prob =
    grade.functional_risk === "none"   ? 0.95 :
    grade.functional_risk === "low"    ? 0.80 :
    grade.functional_risk === "medium" ? 0.60 : 0.30;
  const ev_refurbish = repair_ok_prob * refurb_resale - refurb_cost - logistics;

  const ev_donate  = mrp * CSR_VALUE_PCT + mrp * TAX_BENEFIT_PCT - logistics;
  const ev_recycle = mrp * SALVAGE_MATERIAL_PCT - mrp * RECYCLE_PROCESS_PCT;

  const ev_exchange =
    return_reason === "wrong_variant" || return_reason === "wrong_size"
      ? resale_price * 0.9 - logistics
      : -Infinity;

  const ev_table: EVTable = {
    resell:   Math.round(ev_resell),
    refurbish:Math.round(ev_refurbish),
    donate:   Math.round(ev_donate),
    recycle:  Math.round(ev_recycle),
    exchange: ev_exchange === -Infinity ? 0 : Math.round(ev_exchange),
  };

  // ── Multi-objective scoring ───────────────────────────────────────────────
  // Normalize EV by theoretical max (resell at 85 % of MRP)
  const ev_max = mrp * 0.85;
  const rawEVs: Record<string, number> = {
    resell:   ev_resell,
    refurbish:ev_refurbish,
    donate:   ev_donate,
    recycle:  ev_recycle,
    ...(ev_exchange !== -Infinity ? { exchange: ev_exchange } : {}),
  };

  const score_breakdown: Record<string, ScoreBreakdown> = {};
  for (const [ch, ev] of Object.entries(rawEVs)) {
    const economic     = Math.max(0, Math.min(1, ev / ev_max));
    const sustainability = SUSTAINABILITY_SCORES[ch] ?? 0.5;
    const trust        = TRUST_SCORES[ch] ?? 0.5;
    const final        = W_ECONOMIC * economic + W_SUSTAINABILITY * sustainability + W_TRUST * trust;
    score_breakdown[ch] = {
      economic: parseFloat(economic.toFixed(3)),
      sustainability,
      trust,
      final: parseFloat(final.toFixed(3)),
    };
  }

  // Decision = argmax(final score), tie-break toward sustainability
  const decision = (Object.entries(score_breakdown)
    .sort((a, b) => b[1].final - a[1].final)[0][0]) as DispositionResult["decision"];

  const estimated_recovery = Math.max(0, Math.round(rawEVs[decision] ?? 0));

  const circularity_score = computeCircularityScore(grade, category);
  const co2_saved_kg = CO2_SAVED_KG[decision] ?? 5;

  return {
    decision,
    ev_table,
    score_breakdown,
    estimated_recovery,
    circularity_score,
    co2_saved_kg,
    reasoning_text: "",
    green_credits: GREEN_CREDITS_MAP[decision] ?? 30,
    listing_flagged: return_reason === "not_as_described",
  };
}

function downgradeGrade(g: string): string {
  const order = ["A", "A-", "B+", "B", "C"];
  const idx = order.indexOf(g);
  return order[Math.min(idx + 1, order.length - 1)];
}
