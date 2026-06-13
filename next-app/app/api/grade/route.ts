import { NextRequest, NextResponse } from "next/server";
import { GradeResult } from "@/types";

const MOCK_GRADES: Record<string, GradeResult> = {
  default:  { grade: "A-", functional_risk: "low",    defects: ["minor scuff on base", "light wear on lid"], packaging_status: "missing_box",     accessories_complete: true,  confidence: 0.88 },
  pristine: { grade: "A",  functional_risk: "none",   defects: [],                                           packaging_status: "original_box",    accessories_complete: true,  confidence: 0.96 },
  damaged:  { grade: "B+", functional_risk: "medium", defects: ["cracked corner", "missing cable"],           packaging_status: "missing_box",     accessories_complete: false, confidence: 0.79 },
};

const GRADE_ORDER = ["A", "A-", "B+", "B", "C"];

// Returns the worse of two grades (further right in GRADE_ORDER = worse)
function worstGrade(a: GradeResult, b: GradeResult): GradeResult {
  const ai = GRADE_ORDER.indexOf(a.grade);
  const bi = GRADE_ORDER.indexOf(b.grade);
  if (bi > ai) {
    // b is worse — merge defects from both into b
    return { ...b, defects: [...new Set([...a.defects, ...b.defects])] };
  }
  return { ...a, defects: [...new Set([...a.defects, ...b.defects])] };
}

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

    if (mockKey && MOCK_GRADES[mockKey]) {
      return NextResponse.json(MOCK_GRADES[mockKey]);
    }

    // Collect frames: single image OR up to 3 video frames
    const frameFiles: File[] = [];
    const single = formData.get("image") as File | null;
    if (single) frameFiles.push(single);

    for (let i = 0; i <= 2; i++) {
      const f = formData.get(`frame${i}`) as File | null;
      if (f) frameFiles.push(f);
    }

    if (frameFiles.length === 0) {
      return NextResponse.json(MOCK_GRADES["default"]);
    }

    // Analyze each frame in parallel
    const results = await Promise.all(
      frameFiles.map(async (file) => {
        try {
          const bytes = await file.arrayBuffer();
          const base64 = Buffer.from(bytes).toString("base64");
          return await callGemini(base64, file.type || "image/jpeg");
        } catch {
          return null;
        }
      })
    );

    const valid = results.filter((r): r is GradeResult => r !== null && !!r.grade);

    if (valid.length === 0) {
      return NextResponse.json({ ...MOCK_GRADES["default"], mock: true });
    }

    // Aggregate: worst-case grade, union of all defects, average confidence
    const aggregated = valid.reduce((acc, cur) => worstGrade(acc, cur));
    aggregated.confidence = parseFloat(
      (valid.reduce((s, r) => s + r.confidence, 0) / valid.length).toFixed(2)
    );
    aggregated.defects = [...new Set(aggregated.defects)];

    return NextResponse.json(aggregated);
  } catch {
    return NextResponse.json({ ...MOCK_GRADES["default"], mock: true });
  }
}
