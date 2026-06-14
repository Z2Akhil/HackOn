import { NextRequest, NextResponse } from "next/server";
import { GradeResult } from "@/types";

const MOCK_GRADES: Record<string, GradeResult> = {
  default:  { grade: "A-", functional_risk: "low",    defects: ["minor scuff on base", "light wear on lid"], packaging_status: "missing_box",     accessories_complete: true,  confidence: 0.88 },
  pristine: { grade: "A",  functional_risk: "none",   defects: [],                                           packaging_status: "original_box",    accessories_complete: true,  confidence: 0.96 },
  damaged:  { grade: "B+", functional_risk: "medium", defects: ["cracked corner", "missing cable"],           packaging_status: "missing_box",     accessories_complete: false, confidence: 0.79 },
};

function gradePrompt(count: number): string {
  const multi = count > 1;
  return `You are a product condition grader for an e-commerce returns system. You are receiving ${multi ? `${count} photos of the SAME product taken from different angles` : "1 photo of a product"}. Analyze ${multi ? "ALL images together as a complete set" : "the image"} and return a single consolidated assessment. Return ONLY valid JSON — no markdown, no explanation, just the raw JSON object.

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
A  = Like new, no visible wear across all angles
A- = Minor cosmetic issues (light scratches, scuffs) visible in any photo
B+ = Moderate wear, fully functional
B  = Heavy wear or minor functional issues
C  = Poor condition or significant functional problems

${multi ? `Multi-angle rules:
- A defect visible in ANY of the photos must appear in defects[].
- A component counts as missing if it is absent across ALL photos where it would be visible.
- Assign the WORST grade seen across all angles — never average.
- If photos show different angles revealing different defects, list every unique defect.
- Set confidence higher when multiple angles agree; lower when photos are blurry or contradictory.

` : ""}Accessories check:
- Assess whether all expected components for this product type appear present.
- If any component is visibly absent or the set looks incomplete, set accessories_complete: false and list each missing item in defects[].
- Never assume a component is present if it is not clearly visible.

Rules:
- Be specific about defects (e.g. "cracked hinge", "deep scratches on surface", "missing power cable").
- If images are blurry or unclear, set confidence below 0.6.`;
}

interface Frame { base64: string; mimeType: string; }

async function callGeminiMulti(frames: Frame[]): Promise<GradeResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const content: Parameters<typeof model.generateContent>[0] = [
      gradePrompt(frames.length),
      ...frames.map(f => ({ inlineData: { data: f.base64, mimeType: f.mimeType as "image/jpeg" } })),
    ];

    const result = await model.generateContent(content);
    const text = result.response.text().trim();
    const json = text.replace(/^```[a-z]*\n?/, "").replace(/\n?```\s*$/, "").trim();
    return JSON.parse(json) as GradeResult;
  } catch (err) {
    console.error("[grade] Gemini error:", err);
    return null;
  }
}

async function callGroqMulti(frames: Frame[]): Promise<GradeResult | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      { type: "text", text: gradePrompt(frames.length) },
      ...frames.map(f => ({ type: "image_url", image_url: { url: `data:${f.mimeType};base64,${f.base64}` } })),
    ];

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [{ role: "user", content }],
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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const mockKey = formData.get("mock") as string | null;

    if (mockKey && MOCK_GRADES[mockKey]) {
      return NextResponse.json(MOCK_GRADES[mockKey]);
    }

    // Collect all frames
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

    // Convert all frames to base64 in parallel
    const frames: Frame[] = await Promise.all(
      frameFiles.map(async (file) => ({
        base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
        mimeType: file.type || "image/jpeg",
      }))
    );

    // Single AI call with ALL images — holistic multi-angle analysis
    const result = (await callGeminiMulti(frames)) ?? (await callGroqMulti(frames));

    if (!result || !result.grade) {
      return NextResponse.json({ ...MOCK_GRADES["default"], mock: true });
    }

    result.defects = [...new Set(result.defects)];
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ...MOCK_GRADES["default"], mock: true });
  }
}
