import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface ChatEntry {
  role: string;
  content: string;
}

interface ChatRequest {
  message: string;
  history: ChatEntry[];
  start?: boolean;
}

const MAX_HISTORY_ENTRIES = 50;
const MAX_MESSAGE_LENGTH = 2000;
const GEMINI_TIMEOUT_MS = 30000;

function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(",").map((o) => o.trim()).filter(Boolean);
  }
  return ["http://localhost:3000"];
}

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  const allowed = getAllowedOrigins();
  return allowed.includes(origin);
}

function addCorsHeaders(response: NextResponse, origin: string): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

const TRIAGE_SYSTEM_PROMPT = `You are an Amazon Returns Triage Agent. You guide customers through a live product inspection via their webcam. Your instructions should be short, conversational sentences. Ask the user to: show the item, rotate it slowly, point out any damage they see. Comment on what you observe. Keep responses to 1-3 sentences max.`;

function validateChatRequest(body: unknown): { valid: true; data: ChatRequest } | { valid: false; error: string } {
  if (body === null || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const obj = body as Record<string, unknown>;

  if (!("message" in obj)) {
    return { valid: false, error: "Missing required field: message" };
  }
  if (!("history" in obj)) {
    return { valid: false, error: "Missing required field: history" };
  }

  if (typeof obj.message !== "string") {
    return { valid: false, error: "Field 'message' must be a string" };
  }
  if (!Array.isArray(obj.history)) {
    return { valid: false, error: "Field 'history' must be an array" };
  }

  if (obj.message.length > MAX_MESSAGE_LENGTH) {
    return { valid: false, error: `Field 'message' exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` };
  }
  if (obj.history.length > MAX_HISTORY_ENTRIES) {
    return { valid: false, error: `Field 'history' exceeds maximum of ${MAX_HISTORY_ENTRIES} entries` };
  }

  for (let i = 0; i < obj.history.length; i++) {
    const entry = obj.history[i];
    if (entry === null || typeof entry !== "object") {
      return { valid: false, error: `history[${i}] must be an object` };
    }
    const entryObj = entry as Record<string, unknown>;
    if (typeof entryObj.role !== "string") {
      return { valid: false, error: `history[${i}].role must be a string` };
    }
    if (typeof entryObj.content !== "string") {
      return { valid: false, error: `history[${i}].content must be a string` };
    }
  }

  if ("start" in obj && typeof obj.start !== "boolean") {
    return { valid: false, error: "Field 'start' must be a boolean" };
  }

  return {
    valid: true,
    data: {
      message: obj.message as string,
      history: obj.history as ChatEntry[],
      start: obj.start as boolean | undefined,
    },
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

async function callGemini(data: ChatRequest): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
    systemInstruction: TRIAGE_SYSTEM_PROMPT,
  });

  // Build conversation history for Gemini
  const mappedHistory = data.history.map((entry) => ({
    role: entry.role === "model" ? "model" : "user",
    parts: [{ text: entry.content }],
  }));

  // Gemini requires the conversation history to begin with a "user" role.
  // The opening agent greeting is a leading "model" message with no preceding
  // user turn, so drop any leading "model" entries before starting the chat.
  let firstUserIdx = mappedHistory.findIndex((h) => h.role === "user");
  const history = firstUserIdx === -1 ? [] : mappedHistory.slice(firstUserIdx);

  // Determine the user message to send
  let userMessage: string;
  if (data.start) {
    userMessage = "Please greet me and ask me to show my product for inspection.";
  } else {
    userMessage = data.message;
  }

  const chat = model.startChat({ history });

  const result = await withTimeout(
    chat.sendMessage(userMessage),
    GEMINI_TIMEOUT_MS,
    "AI service timeout"
  );

  const response = result.response;
  return response.text();
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (!isOriginAllowed(origin)) {
    return new NextResponse(null, { status: 204 });
  }

  const response = new NextResponse(null, { status: 204 });
  return addCorsHeaders(response, origin!);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    const res = NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
    if (isOriginAllowed(origin)) {
      return addCorsHeaders(res, origin!);
    }
    return res;
  }

  const validation = validateChatRequest(body);

  if (!validation.valid) {
    const res = NextResponse.json(
      { error: validation.error },
      { status: 400 }
    );
    if (isOriginAllowed(origin)) {
      return addCorsHeaders(res, origin!);
    }
    return res;
  }

  try {
    const responseText = await callGemini(validation.data);
    const res = NextResponse.json({ response: responseText }, { status: 200 });
    if (isOriginAllowed(origin)) {
      return addCorsHeaders(res, origin!);
    }
    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const res = NextResponse.json(
      { error: message },
      { status: 502 }
    );
    if (isOriginAllowed(origin)) {
      return addCorsHeaders(res, origin!);
    }
    return res;
  }
}
