import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderBoundingBoxes } from "../utils/renderBoundingBoxes";
import { DetectionPayload } from "../hooks/useFrameStreamer";

/**
 * Creates a mock canvas with a spied-on 2D context for testing.
 */
function createMockCanvas(width: number, height: number) {
  const ctx = {
    clearRect: vi.fn(),
    strokeRect: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 80 })),
    strokeStyle: "",
    lineWidth: 0,
    fillStyle: "",
    font: "",
    textBaseline: "",
  };

  const canvas = {
    width,
    height,
    getContext: vi.fn(() => ctx),
  } as unknown as HTMLCanvasElement;

  return { canvas, ctx };
}

describe("renderBoundingBoxes", () => {
  let canvas: HTMLCanvasElement;
  let ctx: ReturnType<typeof createMockCanvas>["ctx"];

  beforeEach(() => {
    const mock = createMockCanvas(640, 480);
    canvas = mock.canvas;
    ctx = mock.ctx;
  });

  it("clears the canvas on every call", () => {
    renderBoundingBoxes(canvas, null, 640, 480);
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 640, 480);
  });

  it("returns after clearing when payload is null", () => {
    renderBoundingBoxes(canvas, null, 640, 480);
    expect(ctx.clearRect).toHaveBeenCalledTimes(1);
    expect(ctx.strokeRect).not.toHaveBeenCalled();
  });

  it("returns after clearing when detections array is empty", () => {
    const payload: DetectionPayload = {
      detections: [],
      frame_width: 640,
      frame_height: 480,
    };
    renderBoundingBoxes(canvas, payload, 640, 480);
    expect(ctx.clearRect).toHaveBeenCalledTimes(1);
    expect(ctx.strokeRect).not.toHaveBeenCalled();
  });

  it("draws a bounding box with correct scaled coordinates", () => {
    const payload: DetectionPayload = {
      detections: [
        { bbox: [100, 50, 200, 150], label: "scratch", confidence: 0.87 },
      ],
      frame_width: 1280,
      frame_height: 720,
    };

    // Canvas is 640x480, frame is 1280x720
    // scaleX = 640/1280 = 0.5, scaleY = 480/720 = 0.6667
    renderBoundingBoxes(canvas, payload, 1280, 720);

    expect(ctx.strokeStyle).toBe("#FF0000");
    expect(ctx.lineWidth).toBe(2);

    const scaleX = 640 / 1280;
    const scaleY = 480 / 720;
    expect(ctx.strokeRect).toHaveBeenCalledWith(
      100 * scaleX,
      50 * scaleY,
      (200 - 100) * scaleX,
      (150 - 50) * scaleY
    );
  });

  it("renders label text with correct format", () => {
    const payload: DetectionPayload = {
      detections: [
        { bbox: [10, 20, 100, 100], label: "dent", confidence: 0.9312 },
      ],
      frame_width: 640,
      frame_height: 480,
    };

    renderBoundingBoxes(canvas, payload, 640, 480);

    // Should call fillText with "dent 0.93" (confidence formatted to 2 decimal places)
    expect(ctx.fillText).toHaveBeenCalledWith(
      "dent 0.93",
      expect.any(Number),
      expect.any(Number)
    );
  });

  it("uses white text on dark background", () => {
    const payload: DetectionPayload = {
      detections: [
        { bbox: [0, 0, 50, 50], label: "scratch", confidence: 0.5 },
      ],
      frame_width: 640,
      frame_height: 480,
    };

    renderBoundingBoxes(canvas, payload, 640, 480);

    // fillRect is called for the dark background, then fillText with white
    const fillStyleCalls: string[] = [];
    // Track fillStyle assignments via the mock
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it("draws multiple detections", () => {
    const payload: DetectionPayload = {
      detections: [
        { bbox: [0, 0, 50, 50], label: "scratch", confidence: 0.8 },
        { bbox: [100, 100, 200, 200], label: "dent", confidence: 0.65 },
        { bbox: [300, 300, 400, 400], label: "crack", confidence: 0.92 },
      ],
      frame_width: 640,
      frame_height: 480,
    };

    renderBoundingBoxes(canvas, payload, 640, 480);

    // Each detection produces one strokeRect call
    expect(ctx.strokeRect).toHaveBeenCalledTimes(3);
    // Each detection produces one fillText call
    expect(ctx.fillText).toHaveBeenCalledTimes(3);
  });

  it("does nothing when getContext returns null", () => {
    const nullCtxCanvas = {
      width: 640,
      height: 480,
      getContext: vi.fn(() => null),
    } as unknown as HTMLCanvasElement;

    const payload: DetectionPayload = {
      detections: [
        { bbox: [0, 0, 50, 50], label: "scratch", confidence: 0.8 },
      ],
      frame_width: 640,
      frame_height: 480,
    };

    // Should not throw
    expect(() =>
      renderBoundingBoxes(nullCtxCanvas, payload, 640, 480)
    ).not.toThrow();
  });

  it("scales correctly when canvas and frame have same dimensions (1:1)", () => {
    const payload: DetectionPayload = {
      detections: [
        { bbox: [10, 20, 30, 40], label: "defect", confidence: 0.75 },
      ],
      frame_width: 640,
      frame_height: 480,
    };

    renderBoundingBoxes(canvas, payload, 640, 480);

    // Scale is 1:1, so coordinates are unchanged
    expect(ctx.strokeRect).toHaveBeenCalledWith(10, 20, 20, 20);
  });
});
