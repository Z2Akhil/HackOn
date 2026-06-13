"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import VideoFeed from "./VideoFeed";
import ChatPanel from "./ChatPanel";
import TTSToggle from "./TTSToggle";
import { useFrameStreamer, DetectionPayload } from "../hooks/useFrameStreamer";
import { useBoundingBoxRenderer } from "../hooks/useBoundingBoxRenderer";
import { useTriageChat } from "../hooks/useTriageChat";
import { useTTS } from "../hooks/useTTS";

export type SessionStatus = "idle" | "initializing" | "active" | "degraded";

interface SessionControls {
  status: SessionStatus;
  error: string | null;
  onStart: () => void;
  onEnd: () => void;
}

function SessionControlsPanel({ status, error, onStart, onEnd }: SessionControls) {
  return (
    <div className="session-controls">
      {error && (
        <div className="session-error" role="alert">
          {error}
        </div>
      )}

      {status === "idle" && (
        <button
          className="btn-start"
          onClick={onStart}
          aria-label="Start Session"
        >
          Start Session
        </button>
      )}

      {status === "initializing" && (
        <button className="btn-initializing" disabled aria-label="Initializing">
          Initializing…
        </button>
      )}

      {(status === "active" || status === "degraded") && (
        <button
          className="btn-end"
          onClick={onEnd}
          aria-label="End Session"
        >
          End Session
        </button>
      )}
    </div>
  );
}

export default function TriageRoom() {
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [detectionPayload, setDetectionPayload] = useState<DetectionPayload | null>(null);
  const [frameWidth, setFrameWidth] = useState(640);
  const [frameHeight, setFrameHeight] = useState(480);

  // Refs for video and canvas elements (passed to VideoFeed and hooks)
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Promise-based stream ready/error resolution for the start flow
  const streamReadyResolve = useRef<((stream: MediaStream) => void) | null>(null);
  const streamErrorReject = useRef<((error: string) => void) | null>(null);

  // Hooks
  const triageChat = useTriageChat();
  const tts = useTTS();

  // Track previous message count so we can detect new agent messages for TTS
  const prevMessageCountRef = useRef(0);

  // Frame streamer hook — activated when isActive is true
  useFrameStreamer({
    videoRef,
    isActive,
    onDetection: useCallback((payload: DetectionPayload) => {
      setDetectionPayload(payload);
      setFrameWidth(payload.frame_width);
      setFrameHeight(payload.frame_height);
    }, []),
    onDisconnect: useCallback(() => {
      // Only transition to degraded if the session is currently active
      setStatus((prev) => (prev === "active" ? "degraded" : prev));
    }, []),
  });

  // Bounding box renderer hook — clears when payload is null
  useBoundingBoxRenderer({
    canvasRef,
    payload: detectionPayload,
    frameWidth,
    frameHeight,
  });

  // TTS: speak new agent messages when not muted
  useEffect(() => {
    const messages = triageChat.messages;
    if (messages.length > prevMessageCountRef.current) {
      const newMessages = messages.slice(prevMessageCountRef.current);
      for (const msg of newMessages) {
        if (msg.role === "model") {
          tts.speak(msg.content);
        }
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [triageChat.messages, tts]);

  // Callbacks for VideoFeed stream events
  const handleStreamReady = useCallback((stream: MediaStream) => {
    if (streamReadyResolve.current) {
      streamReadyResolve.current(stream);
      streamReadyResolve.current = null;
      streamErrorReject.current = null;
    }
  }, []);

  const handleStreamError = useCallback((errorMsg: string) => {
    if (streamErrorReject.current) {
      streamErrorReject.current(errorMsg);
      streamReadyResolve.current = null;
      streamErrorReject.current = null;
    }
  }, []);

  const handleStreamLost = useCallback(() => {
    // Camera lost mid-session — stop everything
    setIsActive(false);
    setDetectionPayload(null);
    setError("Camera connection was lost. The device may have been disconnected.");
    setStatus("idle");
    tts.stop();
  }, [tts]);

  /**
   * Full session start flow (Task 8.1):
   * 1. Set status to "initializing"
   * 2. Acquire camera via VideoFeed (isActive → true, wait for onStreamReady/onStreamError)
   * 3. useFrameStreamer activates automatically when isActive is true (opens WS)
   * 4. Call triageChat.startSession() to get initial greeting
   * 5. If all succeed → set status to "active"
   * 6. If any step fails → stop camera, close WS, show error, return to idle
   */
  const handleStart = useCallback(async () => {
    setError(null);
    setStatus("initializing");

    // Step 1: Acquire camera — set isActive to true and wait for the stream
    const cameraPromise = new Promise<MediaStream>((resolve, reject) => {
      streamReadyResolve.current = resolve;
      streamErrorReject.current = reject;
    });

    setIsActive(true);

    try {
      // Wait for camera to be ready
      await cameraPromise;
    } catch (cameraError) {
      // Camera failed — release resources and return to idle
      setIsActive(false);
      setError(`Camera failed: ${cameraError}`);
      setStatus("idle");
      return;
    }

    // Step 2: WebSocket is opened automatically by useFrameStreamer when isActive=true
    // We treat it as connected once camera succeeds (WS opens in background)

    // Step 3: Send chat start request
    try {
      await triageChat.startSession();
      // Check if the chat hook set an error (it manages its own error state)
      // We need to verify the session actually got a response
    } catch (chatError) {
      // Chat start failed — release camera and WS resources
      setIsActive(false);
      setError(`Chat failed: ${chatError instanceof Error ? chatError.message : "Failed to start chat session"}`);
      setStatus("idle");
      return;
    }

    // All steps succeeded — transition to active
    setStatus("active");
  }, [triageChat]);

  /**
   * Full session end flow (Task 8.2):
   * 1. Set isActive to false (stops frame capture + closes WS + stops camera)
   * 2. Clear canvas (set payload to null)
   * 3. Keep chat messages visible (don't clear them)
   * 4. Set status to "idle"
   * 5. Stop TTS
   */
  const handleEnd = useCallback(() => {
    // Step 1: Deactivate — this stops frame capture, closes WS, stops camera
    setIsActive(false);

    // Step 2: Clear bounding box overlay
    setDetectionPayload(null);

    // Step 3: Chat messages are retained (no clearing of triageChat state)

    // Step 4: Return to idle
    setStatus("idle");
    setError(null);

    // Step 5: Stop any ongoing TTS
    tts.stop();
  }, [tts]);

  return (
    <div className="triage-room">
      <div className="triage-room__layout">
        {/* Left panel: Video feed area */}
        <div className="triage-room__video-panel">
          <VideoFeed
            isActive={isActive}
            onStreamReady={handleStreamReady}
            onStreamError={handleStreamError}
            onStreamLost={handleStreamLost}
            videoRef={videoRef}
            canvasRef={canvasRef}
          />

          {status === "idle" && !isActive && (
            <div className="triage-room__video-placeholder" aria-label="Video feed area">
              <p>Click &quot;Start Session&quot; to begin triage inspection</p>
            </div>
          )}

          {status === "degraded" && (
            <div className="triage-room__degraded-indicator" role="status" aria-live="polite">
              <span className="degraded-badge">Defect detection unavailable</span>
            </div>
          )}
        </div>

        {/* Right panel: Chat area + TTS toggle */}
        <div className="triage-room__chat-panel">
          <div className="triage-room__chat-header">
            <TTSToggle tts={tts} />
          </div>
          <ChatPanel
            messages={triageChat.messages}
            isLoading={triageChat.isLoading}
            error={triageChat.error}
            onSendMessage={triageChat.sendMessage}
            onRetry={triageChat.retry}
          />
        </div>
      </div>

      <SessionControlsPanel
        status={status}
        error={error}
        onStart={handleStart}
        onEnd={handleEnd}
      />
    </div>
  );
}
