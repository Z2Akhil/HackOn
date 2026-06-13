"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * A single detected defect with bounding box, label, and confidence.
 */
export interface Detection {
  bbox: [number, number, number, number];
  label: string;
  confidence: number;
}

/**
 * Payload returned by the Vision Service for each processed frame.
 */
export interface DetectionPayload {
  detections: Detection[];
  frame_width: number;
  frame_height: number;
}

interface UseFrameStreamerOptions {
  /** Ref to the video element being streamed */
  videoRef: React.RefObject<HTMLVideoElement>;
  /** Whether the frame streamer should be active (session running) */
  isActive: boolean;
  /** Called when a detection payload is received from the Vision Service */
  onDetection?: (payload: DetectionPayload) => void;
  /** Called when the WebSocket disconnects or fails to connect */
  onDisconnect?: () => void;
}

const WS_URL = "ws://localhost:8000/vision-stream";
const FRAME_INTERVAL_MS = 100; // 10 fps
const JPEG_QUALITY = 0.7;

/**
 * Custom hook that captures frames from a video element at ~10fps,
 * encodes them as Base64 JPEG, and streams them to the Vision Service
 * via WebSocket. Receives detection payloads in response.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
export function useFrameStreamer({
  videoRef,
  isActive,
  onDetection,
  onDisconnect,
}: UseFrameStreamerOptions): void {
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keep callbacks in refs to avoid re-triggering effects
  const onDetectionRef = useRef(onDetection);
  const onDisconnectRef = useRef(onDisconnect);
  useEffect(() => {
    onDetectionRef.current = onDetection;
  }, [onDetection]);
  useEffect(() => {
    onDisconnectRef.current = onDisconnect;
  }, [onDisconnect]);

  const stopCapture = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const closeWebSocket = useCallback(() => {
    if (wsRef.current) {
      // Remove event handlers before closing to avoid triggering onDisconnect
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.readyState < video.HAVE_CURRENT_DATA) {
      return null;
    }

    // Create or reuse a temporary canvas for frame capture
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    // Strip the "data:image/jpeg;base64," prefix
    const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, "");
    return base64Data;
  }, [videoRef]);

  useEffect(() => {
    if (!isActive) {
      // Cleanup when session ends
      stopCapture();
      closeWebSocket();
      return;
    }

    // Open WebSocket connection
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      // Start frame capture interval at 10fps
      intervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          const frame = captureFrame();
          if (frame) {
            ws.send(frame);
          }
        }
      }, FRAME_INTERVAL_MS);
    };

    ws.onmessage = (event) => {
      try {
        const payload: DetectionPayload = JSON.parse(event.data);
        if (payload.detections !== undefined) {
          onDetectionRef.current?.(payload);
        }
      } catch {
        // Ignore malformed messages from the server
        console.warn("[useFrameStreamer] Failed to parse WebSocket message:", event.data);
      }
    };

    ws.onerror = (event) => {
      console.warn("[useFrameStreamer] WebSocket error:", event);
      stopCapture();
      onDisconnectRef.current?.();
    };

    ws.onclose = () => {
      console.warn("[useFrameStreamer] WebSocket connection closed");
      stopCapture();
      onDisconnectRef.current?.();
    };

    // Cleanup on unmount or when isActive changes
    return () => {
      stopCapture();
      closeWebSocket();
    };
  }, [isActive, captureFrame, stopCapture, closeWebSocket]);
}
