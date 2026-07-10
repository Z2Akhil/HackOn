import { NextRequest, NextResponse } from "next/server";
import { computeEV } from "@/lib/ev-optimizer";
import { GradeResult } from "@/types";
import { incrementListingFlag } from "@/lib/data";

async function getGeminiReasoning(
  decision: string,
  ev_table: { resell: number; refurbish: number; donate: number; recycle: number; exchange: number },
  grade: GradeResult,
  product_name: string,
  return_reason: string
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are an AI explaining a product return disposition decision to a customer. Write exactly 2 clear sentences. Be specific about the numbers. No preamble, no bullet points — just 2 sentences.

Product: ${product_name}
Condition grade: ${grade.grade} — ${grade.functional_risk} functional risk
Defects found: ${grade.defects.length > 0 ? grade.defects.join(", ") : "none"}
Return reason: ${return_reason}
Decision: ${decision.toUpperCase()}
Expected value by channel (₹): resell=${ev_table.resell}, refurbish=${ev_table.refurbish}, donate=${ev_table.donate}, recycle=${ev_table.recycle}
Multi-objective scores (economic 50% + sustainability 30% + trust 20%) determined this outcome.`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    return null;
  }
}

const MOCK_REASONING: Record<string, (g: GradeResult, r: number) => string> = {
  resell:   (g, r) => `The ${g.grade}-graded item shows ${g.defects.length === 0 ? "no defects" : g.defects.slice(0,2).join(" and ")} with ${g.functional_risk} functional risk, making open-box resale the optimal channel. At ₹${r.toLocaleString("en-IN")} expected recovery — the highest across all 5 channels — reselling maximises value recovery while keeping the item in circulation.`,
  refurbish:(g, r) => `The item's ${g.functional_risk} functional risk and ${g.grade} grade make direct resale less profitable than refurbishment after repairs. Post-refurbishment expected recovery of ₹${r.toLocaleString("en-IN")} outperforms donate and recycle channels given the product's repair potential.`,
  donate:   (g, r) => `Significant defects reduce resale and refurbishment viability below the combined CSR and tax-benefit value of donation. Donating recovers ₹${r.toLocaleString("en-IN")} in social value, earns maximum green credits, and diverts the item from landfill.`,
  recycle:  (g, r) => `The item's condition makes resale and refurbishment unprofitable — recycling recovers ₹${r.toLocaleString("en-IN")} in raw material value and ensures zero landfill. This is the responsible end-of-life choice given the functional issues detected.`,
  exchange: (g, r) => `The return reason indicates a variant or size mismatch rather than a quality issue — the item itself grades ${g.grade} with ${g.functional_risk} functional risk. Re-routing it for the correct variant exchange recovers ₹${r.toLocaleString("en-IN")} without any resale processing overhead.`,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { grade, product_id, product_name, category, mrp, return_reason } = body as {
      grade: GradeResult;
      product_id: string;
      product_name: string;
      category: string;
      mrp: number;
      return_reason: string;
    };

    const result = computeEV(grade, category, mrp, return_reason);

    if (return_reason === "not_as_described") {
      incrementListingFlag(product_id);
    }

    // Second-life requests arrive after the return window; phrase the reason so
    // the narrator doesn't describe them as a return.
    const reasonLabel = return_reason === "second_life"
      ? "customer-initiated second-life listing (outside return window, not a return)"
      : return_reason;

    const geminiReasoning = await getGeminiReasoning(
      result.decision, result.ev_table, grade, product_name ?? "Product", reasonLabel
    );

    const fallback = MOCK_REASONING[result.decision] ?? MOCK_REASONING["resell"];
    result.reasoning_text = geminiReasoning ?? fallback(grade, result.estimated_recovery);

    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Disposition failed" }, { status: 500 });
  }
}
