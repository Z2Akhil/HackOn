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

const GRADE_PROMPT = `You are a product condition grader for an e-commerce returns system. Analyze this product image carefully and return ONLY valid JSON — no markdown, no explanation, just the raw JSON object.

Schema (use exactly these field names and value sets):
{
  "grade": "A" | "A-" | "B+" | "B" | "C",
  "functional_risk": "none" | "low" | "medium" | "high",
  "defects": ["string describing each visible defect or missing item"],
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

Accessories check:
- Assess whether all expected components for this type of product appear to be present.
- If any component is visibly absent or the set looks incomplete, set accessories_complete: false and list each missing item in defects.
- Never assume a component is present if it is not clearly visible in the image.

Rules:
- Be specific about defects (e.g. "cracked hinge", "deep scratches on surface", "missing component").
- If the image is blurry or unclear, set confidence below 0.6.`;

async function callGroq(imageBase64: string, mimeType: string): Promise<GradeResult | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: GRADE_PROMPT },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        }],
        temperature: 0,
        max_tokens: 512,
      }),
    });

    if (!res.ok) {
      console.error("[grade] Groq error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const text = (data.choices?.[0]?.message?.content ?? "").trim();
    const json = text.replace(/^```[a-z]*\n?/, "").replace(/\n?```\s*$/, "").trim();
    return JSON.parse(json) as GradeResult;
  } catch (err) {
    console.error("[grade] Groq fallback error:", err);
    return null;
  }
}

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
    const json = text.replace(/^```[a-z]*\n?/, "").replace(/\n?```\s*$/, "").trim();
    return JSON.parse(json) as GradeResult;
  } catch (err) {
    console.error("[grade] Gemini error:", err);
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

    // Analyze each frame in parallel — Gemini first, Groq fallback
    const results = await Promise.all(
      frameFiles.map(async (file) => {
        try {
          const bytes = await file.arrayBuffer();
          const base64 = Buffer.from(bytes).toString("base64");
          const mime = file.type || "image/jpeg";
          return (await callGemini(base64, mime)) ?? (await callGroq(base64, mime));
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
