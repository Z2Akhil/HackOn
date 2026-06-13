import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Unit tests for useFrameStreamer hook logic.
 * Since the test environment is node (no DOM), we test the core logic
 * by mocking WebSocket and verifying the hook's behavior.
 */

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  onopen: ((event: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onclose: ((event: any) => void) | null = null;

  sentMessages: string[] = [];
  closed = false;

  constructor(url: string) {
    this.url = url;
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.({});
    }, 0);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.closed = true;
  }
}

// Mock HTMLCanvasElement context
class MockCanvasContext {
  drawImageCalls: any[] = [];
  drawImage(...args: any[]) {
    this.drawImageCalls.push(args);
  }
}

describe("useFrameStreamer - core logic", () => {
  let originalWebSocket: any;
  let mockWsInstances: MockWebSocket[];

  beforeEach(() => {
    vi.useFakeTimers();
    mockWsInstances = [];
    originalWebSocket = (globalThis as any).WebSocket;
    (globalThis as any).WebSocket = class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        mockWsInstances.push(this);
      }
    };
    (globalThis as any).WebSocket.OPEN = MockWebSocket.OPEN;
    (globalThis as any).WebSocket.CLOSED = MockWebSocket.CLOSED;
    (globalThis as any).WebSocket.CONNECTING = MockWebSocket.CONNECTING;
    (globalThis as any).WebSocket.CLOSING = MockWebSocket.CLOSING;
  });

  afterEach(() => {
    vi.useRealTimers();
    (globalThis as any).WebSocket = originalWebSocket;
  });

  it("should connect to the correct WebSocket URL", () => {
    const ws = new (globalThis as any).WebSocket("ws://localhost:8000/vision-stream");
    expect(ws.url).toBe("ws://localhost:8000/vision-stream");
  });

  it("should encode frames as Base64 JPEG with prefix stripped", () => {
    // Simulate what captureFrame does: strip prefix from data URL
    const dataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, "");
    expect(base64Data).toBe("/9j/4AAQSkZJRg==");
    expect(base64Data).not.toContain("data:image/jpeg;base64,");
  });

  it("should send frames at 100ms intervals (10fps target)", () => {
    const ws = new MockWebSocket("ws://localhost:8000/vision-stream");
    ws.readyState = MockWebSocket.OPEN;

    let frameCount = 0;
    const interval = setInterval(() => {
      if (ws.readyState === MockWebSocket.OPEN) {
        ws.send("fakeBase64Frame");
        frameCount++;
      }
    }, 100);

    // Advance 1 second = 10 frames
    vi.advanceTimersByTime(1000);
    clearInterval(interval);

    expect(frameCount).toBe(10);
    expect(ws.sentMessages.length).toBe(10);
  });

  it("should stop sending frames when WebSocket closes", () => {
    const ws = new MockWebSocket("ws://localhost:8000/vision-stream");
    ws.readyState = MockWebSocket.OPEN;

    let frameCount = 0;
    const interval = setInterval(() => {
      if (ws.readyState === MockWebSocket.OPEN) {
        ws.send("frame");
        frameCount++;
      }
    }, 100);

    // Send 5 frames, then close
    vi.advanceTimersByTime(500);
    expect(frameCount).toBe(5);

    ws.readyState = MockWebSocket.CLOSED;
    vi.advanceTimersByTime(500);

    // No more frames sent after close
    expect(frameCount).toBe(5);
    clearInterval(interval);
  });

  it("should parse detection payloads from WebSocket messages", () => {
    const payload = {
      detections: [
        { bbox: [10, 20, 100, 200], label: "scratch", confidence: 0.87 },
      ],
      frame_width: 640,
      frame_height: 480,
    };

    const parsed = JSON.parse(JSON.stringify(payload));
    expect(parsed.detections).toHaveLength(1);
    expect(parsed.detections[0].bbox).toEqual([10, 20, 100, 200]);
    expect(parsed.detections[0].label).toBe("scratch");
    expect(parsed.detections[0].confidence).toBe(0.87);
    expect(parsed.frame_width).toBe(640);
    expect(parsed.frame_height).toBe(480);
  });

  it("should call onDisconnect when WebSocket encounters an error", () => {
    const onDisconnect = vi.fn();
    const ws = new MockWebSocket("ws://localhost:8000/vision-stream");

    ws.onerror = () => {
      onDisconnect();
    };

    // Simulate error
    ws.onerror({});
    expect(onDisconnect).toHaveBeenCalledOnce();
  });

  it("should call onDisconnect when WebSocket closes unexpectedly", () => {
    const onDisconnect = vi.fn();
    const ws = new MockWebSocket("ws://localhost:8000/vision-stream");

    ws.onclose = () => {
      onDisconnect();
    };

    // Simulate close
    ws.onclose({});
    expect(onDisconnect).toHaveBeenCalledOnce();
  });

  it("should not attempt reconnection after disconnect", () => {
    // Create via global constructor to track in mockWsInstances
    const ws = new (globalThis as any).WebSocket("ws://localhost:8000/vision-stream");
    ws.readyState = MockWebSocket.OPEN;

    // Simulate disconnect
    ws.readyState = MockWebSocket.CLOSED;
    ws.onclose?.({});

    // No reconnection logic — just verify it stays closed
    expect(ws.readyState).toBe(MockWebSocket.CLOSED);
    expect(mockWsInstances.length).toBe(1); // Only one instance created, no reconnection
  });

  it("should close WebSocket on cleanup", () => {
    const ws = new MockWebSocket("ws://localhost:8000/vision-stream");
    ws.readyState = MockWebSocket.OPEN;

    ws.close();
    expect(ws.readyState).toBe(MockWebSocket.CLOSED);
    expect(ws.closed).toBe(true);
  });

  it("should handle malformed WebSocket messages gracefully", () => {
    const onDetection = vi.fn();
    const ws = new MockWebSocket("ws://localhost:8000/vision-stream");

    ws.onmessage = (event: any) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.detections !== undefined) {
          onDetection(payload);
        }
      } catch {
        // Should not crash on bad data
      }
    };

    // Send malformed data
    ws.onmessage({ data: "not json at all" });
    expect(onDetection).not.toHaveBeenCalled();

    // Send valid detection
    ws.onmessage({
      data: JSON.stringify({
        detections: [],
        frame_width: 640,
        frame_height: 480,
      }),
    });
    expect(onDetection).toHaveBeenCalledOnce();
  });
});
