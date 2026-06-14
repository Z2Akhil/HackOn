// Deterministic, synthetic ratings for the demo marketplace.
// Real catalog data has no review data, so we derive a stable star rating and
// review count from the listing's grade + id. Deterministic = same item always
// shows the same numbers (no hydration mismatch, no flicker between renders).

const GRADE_BASE: Record<string, number> = {
  "A": 4.7, "A-": 4.4, "B+": 4.0, "B": 3.7, "C": 3.3,
};

// Simple stable string hash → 0..(mod-1)
function hash(str: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % mod;
}

/** Stable 3.0–5.0 star rating derived from grade with a small per-item jitter. */
export function ratingFor(id: string, grade: string): number {
  const base = GRADE_BASE[grade] ?? 4.0;
  const jitter = (hash(id, 5) - 2) * 0.1; // -0.2 .. +0.2
  return Math.min(5, Math.max(3, parseFloat((base + jitter).toFixed(1))));
}

/** Stable review count, biased higher for better grades. */
export function reviewCountFor(id: string, grade: string): number {
  const gradeBoost = grade === "A" || grade === "A-" ? 1.6 : 1;
  return Math.round((40 + hash(id + "rv", 2400)) * gradeBoost);
}

/** Format like Amazon: 1,248 */
export function formatCount(n: number): string {
  return n.toLocaleString("en-IN");
}
