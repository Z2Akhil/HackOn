import { describe, it, expect } from "vitest";
import { POST } from "../app/api/triage/chat/route";
import { NextRequest } from "next/server";

function createRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/triage/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createInvalidJsonRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/triage/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not valid json{",
  });
}

describe("POST /api/triage/chat - validation", () => {
  it("returns 400 for invalid JSON", async () => {
    const req = createInvalidJsonRequest();
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Invalid JSON");
  });

  it("returns 400 when message field is missing", async () => {
    const req = createRequest({ history: [] });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("message");
  });

  it("returns 400 when history field is missing", async () => {
    const req = createRequest({ message: "hello" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("history");
  });

  it("returns 400 when message is not a string", async () => {
    const req = createRequest({ message: 123, history: [] });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("message");
    expect(json.error).toContain("string");
  });

  it("returns 400 when history is not an array", async () => {
    const req = createRequest({ message: "hi", history: "not array" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("history");
    expect(json.error).toContain("array");
  });

  it("returns 400 when message exceeds 2000 characters", async () => {
    const req = createRequest({ message: "x".repeat(2001), history: [] });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("2000");
  });

  it("returns 400 when history exceeds 50 entries", async () => {
    const history = Array.from({ length: 51 }, (_, i) => ({
      role: "user",
      content: `msg ${i}`,
    }));
    const req = createRequest({ message: "hi", history });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("50");
  });

  it("returns 400 when history entry has invalid role type", async () => {
    const req = createRequest({
      message: "hi",
      history: [{ role: 123, content: "test" }],
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("role");
    expect(json.error).toContain("string");
  });

  it("returns 400 when history entry has invalid content type", async () => {
    const req = createRequest({
      message: "hi",
      history: [{ role: "user", content: 42 }],
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("content");
    expect(json.error).toContain("string");
  });

  it("returns 400 when start field is not a boolean", async () => {
    const req = createRequest({
      message: "hi",
      history: [],
      start: "yes",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("start");
    expect(json.error).toContain("boolean");
  });

  it("returns 502 when GEMINI_API_KEY is not set", async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      const req = createRequest({
        message: "Hello, I have a damaged item",
        history: [
          { role: "model", content: "Welcome! Show me the product." },
        ],
      });
      const res = await POST(req);
      expect(res.status).toBe(502);
      const json = await res.json();
      expect(json.error).toContain("GEMINI_API_KEY");
    } finally {
      if (originalKey) process.env.GEMINI_API_KEY = originalKey;
    }
  });

  it("returns 502 for valid start request when API key is missing", async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      const req = createRequest({
        message: "",
        history: [],
        start: true,
      });
      const res = await POST(req);
      expect(res.status).toBe(502);
      const json = await res.json();
      expect(json.error).toContain("GEMINI_API_KEY");
    } finally {
      if (originalKey) process.env.GEMINI_API_KEY = originalKey;
    }
  });

  it("passes validation for message at exactly 2000 characters", async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      const req = createRequest({ message: "x".repeat(2000), history: [] });
      const res = await POST(req);
      // Valid request passes validation, fails at Gemini call (502) since no API key
      expect(res.status).toBe(502);
    } finally {
      if (originalKey) process.env.GEMINI_API_KEY = originalKey;
    }
  });

  it("passes validation for history at exactly 50 entries", async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      const history = Array.from({ length: 50 }, (_, i) => ({
        role: "user",
        content: `msg ${i}`,
      }));
      const req = createRequest({ message: "hi", history });
      const res = await POST(req);
      // Valid request passes validation, fails at Gemini call (502) since no API key
      expect(res.status).toBe(502);
    } finally {
      if (originalKey) process.env.GEMINI_API_KEY = originalKey;
    }
  });
});
