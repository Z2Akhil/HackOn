import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface ChatEntry {
  role: string;
  content: string;
}

interface AssessRequest {
  frames: string[]; // array of Base64-encoded JPEG strings (no data: prefix)
  history: ChatEntry[];
}

const GEMINI_TIMEOUT_MS = 45000;
const MAX_FRAMES = 8;

function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(",").map((o) => o.trim()).filter(Boolean);
  }
  return ["http://localhost:3000"];
}

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return getAllowedOrigins().includes(origin);
}

function addCorsHeaders(response: NextResponse, origin: string): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

const ASSESS_SYSTEM_PROMPT = `You are an Amazon Returns Triage Agent performing a final product condition assessment.
You are given several still frames captured from a live webcam inspection while the customer rotated the product to show different angles.
Analyze ALL the frames together to build a complete picture of the item's condition across every visible angle.
Identify the product and any visible defects such as scratches, dents, cracks, stains, discoloration, missing parts, or wear.
Describe each defect's approximate location in plain language (e.g. "top-left corner", "lower body, front face").
Then return your assessment.`;

const RESPONSE_INSTRUCTION = `Respond with ONLY a valid JSON object (no markdown, no code fences) in exactly this shape:
{
  "item": "<short product name>",
  "overall_condition": "<one of: like_new, used_good, used_with_damage, heavily_damaged>",
  "defects": [
    { "type": "<scratch|dent|crack|stain|discoloration|missing_part|wear|other>", "location": "<plain language location>", "severity": "<minor|moderate|severe>" }
  ],
  "packaging_status": "<one of: original_box, generic_packaging, no_packaging, unknown>",
  "accessories_complete": <true | false | null if unknown>,
  "angles_reviewed": <integer number of frames you analyzed>,
  "recommendation": "<one of: approve_return, approve_partial_refund, reject_return, needs_human_review>",
  "summary": "<one or two sentence human-readable summary>",
  "confidence": <number between 0 and 1>
}
If no defects are visible, return an empty defects array and condition "like_new".
Pay special attention to whether original packaging and accessories are visible in any frame.`;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

function validate(body: unknown): { valid: true; data: AssessRequest } | { valid: false; error: string } {
  if (body === null || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object" };
  }
  const obj = body as Record<string, unknown>;
  if (!Array.isArray(obj.frames)) {
    return { valid: false, error: "Field 'frames' must be an array of Base64 JPEG strings" };
  }
  if (obj.frames.length === 0) {
    return { valid: false, error: "At least one frame is required for assessment" };
  }
  if (obj.frames.length > MAX_FRAMES) {
    return { valid: false, error: `Too many frames (max ${MAX_FRAMES})` };
  }
  if (!obj.frames.every((f) => typeof f === "string")) {
    return { valid: false, error: "All frames must be Base64 strings" };
  }
  const history = Array.isArray(obj.history) ? (obj.history as ChatEntry[]) : [];
  return { valid: true, data: { frames: obj.frames as string[], history } };
}

function extractJson(text: string): unknown {
  // Strip markdown code fences if present, then parse the first JSON object.
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }
  return JSON.parse(cleaned);
}

async function assessCondition(data: AssessRequest): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_VISION_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash",
    systemInstruction: ASSESS_SYSTEM_PROMPT,
  });

  // Build the multimodal request: instruction text + all captured frames
  const conversationSummary = data.history
    .map((h) => `${h.role === "model" ? "Agent" : "User"}: ${h.content}`)
    .join("\n");

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    {
      text:
        `Here are ${data.frames.length} frames captured during the inspection.\n\n` +
        (conversationSummary ? `Conversation during inspection:\n${conversationSummary}\n\n` : "") +
        RESPONSE_INSTRUCTION,
    },
  ];

  for (const frame of data.frames) {
    parts.push({ inlineData: { mimeType: "image/jpeg", data: frame } });
  }

  const result = await withTimeout(
    model.generateContent(parts),
    GEMINI_TIMEOUT_MS,
    "AI service timeout during condition assessment"
  );

  const text = result.response.text();
  return extractJson(text);
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!isOriginAllowed(origin)) {
    return new NextResponse(null, { status: 204 });
  }
  return addCorsHeaders(new NextResponse(null, { status: 204 }), origin!);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const res = NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    return isOriginAllowed(origin) ? addCorsHeaders(res, origin!) : res;
  }

  const validation = validate(body);
  if (!validation.valid) {
    const res = NextResponse.json({ error: validation.error }, { status: 400 });
    return isOriginAllowed(origin) ? addCorsHeaders(res, origin!) : res;
  }

  try {
    const condition = await assessCondition(validation.data);
    const res = NextResponse.json({ condition }, { status: 200 });
    return isOriginAllowed(origin) ? addCorsHeaders(res, origin!) : res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const res = NextResponse.json({ error: message }, { status: 502 });
    return isOriginAllowed(origin) ? addCorsHeaders(res, origin!) : res;
  }
}
