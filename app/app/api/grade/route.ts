import { NextRequest, NextResponse } from "next/server";
import { GradeResult } from "@/types";

const MOCK_GRADES: Record<string, GradeResult> = {
  default:  { grade: "A-", functional_risk: "low",    defects: ["minor scuff on base", "light wear on lid"], packaging_status: "missing_box",     accessories_complete: true,  confidence: 0.88 },
  pristine: { grade: "A",  functional_risk: "none",   defects: [],                                           packaging_status: "original_box",    accessories_complete: true,  confidence: 0.96 },
  damaged:  { grade: "B+", functional_risk: "medium", defects: ["cracked corner", "missing cable"],           packaging_status: "missing_box",     accessories_complete: false, confidence: 0.79 },
};

const GRADE_PROMPT = `You are a product condition grader for an e-commerce returns system. Analyze this product image carefully and return ONLY valid JSON — no markdown, no explanation, just the JSON object.

Schema (use exactly these values):
{
  "grade": "A" | "A-" | "B+" | "B" | "C",
  "functional_risk": "none" | "low" | "medium" | "high",
  "defects": ["string describing each visible defect"],
  "packaging_status": "original_box" | "missing_box" | "original_packaging" | "damaged_packaging",
  "accessories_complete": true | false,
  "confidence": 0.0 to 1.0
}

Grade scale:
A  = Like new, no visible wear
A- = Minor cosmetic issues (light scratches, scuffs)
B+ = Moderate wear, fully functional
B  = Heavy wear or minor functional issues
C  = Poor condition or significant functional problems

Be specific about defects. If image is unclear, lower confidence score.`;

async function callGemini(imageBase64: string, mimeType: string): Promise<GradeResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent([
      GRADE_PROMPT,
      { inlineData: { data: imageBase64, mimeType: mimeType as any } },
    ]);

    const text = result.response.text().trim();
    // Strip markdown code fences if model adds them
    const json = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    return JSON.parse(json) as GradeResult;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const mockKey = formData.get("mock") as string | null;

    // Explicit mock requested (demo safety net)
    if (mockKey && MOCK_GRADES[mockKey]) {
      return NextResponse.json(MOCK_GRADES[mockKey]);
    }

    const file = formData.get("image") as File | null;
    if (!file) {
      return NextResponse.json(MOCK_GRADES["default"]);
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = file.type || "image/jpeg";

    const geminiResult = await callGemini(base64, mimeType);
    if (geminiResult) {
      return NextResponse.json(geminiResult);
    }

    // Fallback mock — demo never breaks
    return NextResponse.json({ ...MOCK_GRADES["default"], mock: true });
  } catch {
    return NextResponse.json({ ...MOCK_GRADES["default"], mock: true });
  }
}
