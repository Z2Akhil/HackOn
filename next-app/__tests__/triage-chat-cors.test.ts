import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST, OPTIONS } from "../app/api/triage/chat/route";
import { NextRequest } from "next/server";

function createPostRequest(body: unknown, origin?: string): NextRequest {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (origin) {
    headers["Origin"] = origin;
  }
  return new NextRequest("http://localhost:3000/api/triage/chat", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function createOptionsRequest(origin?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (origin) {
    headers["Origin"] = origin;
  }
  return new NextRequest("http://localhost:3000/api/triage/chat", {
    method: "OPTIONS",
    headers,
  });
}

describe("CORS - OPTIONS preflight", () => {
  it("returns 204 with CORS headers for allowed origin", async () => {
    const req = createOptionsRequest("http://localhost:3000");
    const res = await OPTIONS(req);
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
    expect(res.headers.get("Access-Control-Allow-Methods")).toBe("POST, OPTIONS");
    expect(res.headers.get("Access-Control-Allow-Headers")).toBe("Content-Type");
  });

  it("returns 204 without CORS headers for disallowed origin", async () => {
    const req = createOptionsRequest("http://evil.com");
    const res = await OPTIONS(req);
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(res.headers.get("Access-Control-Allow-Methods")).toBeNull();
    expect(res.headers.get("Access-Control-Allow-Headers")).toBeNull();
  });

  it("returns 204 without CORS headers when no origin header present", async () => {
    const req = createOptionsRequest();
    const res = await OPTIONS(req);
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});

describe("CORS - POST with origin", () => {
  it("includes CORS headers for allowed origin", async () => {
    const req = createPostRequest(
      { message: "hi", history: [] },
      "http://localhost:3000"
    );
    const res = await POST(req);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
    expect(res.headers.get("Access-Control-Allow-Methods")).toBe("POST, OPTIONS");
    expect(res.headers.get("Access-Control-Allow-Headers")).toBe("Content-Type");
  });

  it("omits CORS headers for disallowed origin", async () => {
    const req = createPostRequest(
      { message: "hi", history: [] },
      "http://malicious.com"
    );
    const res = await POST(req);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(res.headers.get("Access-Control-Allow-Methods")).toBeNull();
  });

  it("omits CORS headers when no origin header is present", async () => {
    const req = createPostRequest({ message: "hi", history: [] });
    const res = await POST(req);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("includes CORS headers even on 400 error responses for allowed origin", async () => {
    const req = createPostRequest(
      { history: [] }, // missing message
      "http://localhost:3000"
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
  });
});

describe("CORS - ALLOWED_ORIGINS env var", () => {
  const originalEnv = process.env.ALLOWED_ORIGINS;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.ALLOWED_ORIGINS;
    } else {
      process.env.ALLOWED_ORIGINS = originalEnv;
    }
  });

  it("accepts origins from ALLOWED_ORIGINS env var (comma-separated)", async () => {
    process.env.ALLOWED_ORIGINS = "http://app.example.com,http://admin.example.com";

    const req = createOptionsRequest("http://app.example.com");
    const res = await OPTIONS(req);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://app.example.com");
  });

  it("accepts second origin from comma-separated list", async () => {
    process.env.ALLOWED_ORIGINS = "http://app.example.com,http://admin.example.com";

    const req = createOptionsRequest("http://admin.example.com");
    const res = await OPTIONS(req);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://admin.example.com");
  });

  it("rejects origin not in ALLOWED_ORIGINS list", async () => {
    process.env.ALLOWED_ORIGINS = "http://app.example.com,http://admin.example.com";

    const req = createOptionsRequest("http://localhost:3000");
    const res = await OPTIONS(req);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("handles whitespace in ALLOWED_ORIGINS env var", async () => {
    process.env.ALLOWED_ORIGINS = "  http://app.example.com , http://admin.example.com  ";

    const req = createOptionsRequest("http://app.example.com");
    const res = await OPTIONS(req);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://app.example.com");
  });

  it("defaults to http://localhost:3000 when ALLOWED_ORIGINS is not set", async () => {
    delete process.env.ALLOWED_ORIGINS;

    const req = createOptionsRequest("http://localhost:3000");
    const res = await OPTIONS(req);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
  });
});
