"use client";

import { useEffect } from "react";
import { DetectionPayload } from "./useFrameStreamer";
import { renderBoundingBoxes } from "../utils/renderBoundingBoxes";

interface UseBoundingBoxRendererOptions {
  /** Ref to the canvas element used for overlay rendering */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** The latest detection payload from the Vision Service (null clears the canvas) */
  payload: DetectionPayload | null;
  /** Width of the original captured frame in pixels */
  frameWidth: number;
  /** Height of the original captured frame in pixels */
  frameHeight: number;
}

/**
 * Custom hook that renders bounding boxes on a canvas whenever a new
 * DetectionPayload arrives. Clears the canvas when payload is null or empty.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
export function useBoundingBoxRenderer({
  canvasRef,
  payload,
  frameWidth,
  frameHeight,
}: UseBoundingBoxRendererOptions): void {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    renderBoundingBoxes(canvas, payload, frameWidth, frameHeight);
  }, [canvasRef, payload, frameWidth, frameHeight]);
}
