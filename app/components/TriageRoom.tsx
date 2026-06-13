"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import VideoFeed from "./VideoFeed";
import ChatPanel from "./ChatPanel";
import TTSToggle from "./TTSToggle";
import ConditionReportPanel from "./ConditionReportPanel";
import InspectionChecklist, { INSPECTION_STEPS, InspectionStep } from "./InspectionChecklist";
import { useFrameStreamer, DetectionPayload } from "../hooks/useFrameStreamer";
import { useBoundingBoxRenderer } from "../hooks/useBoundingBoxRenderer";
import { useTriageChat } from "../hooks/useTriageChat";
import { useTTS } from "../hooks/useTTS";
import { useConditionAssessment } from "../hooks/useConditionAssessment";

export type SessionStatus = "idle" | "initializing" | "active" | "degraded";

interface SessionControls {
  status: SessionStatus;
  error: string | null;
  isAssessing: boolean;
  onStart: () => void;
  onEnd: () => void;
  onAssess: () => void;
}

function SessionControlsPanel({ status, error, isAssessing, onStart, onEnd, onAssess }: SessionControls) {
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
        <>
          <button
            className="btn-assess"
            onClick={onAssess}
            disabled={isAssessing}
            aria-label="Assess Condition"
          >
            {isAssessing ? "Assessing…" : "Assess Condition"}
          </button>
          <button
            className="btn-end"
            onClick={onEnd}
            aria-label="End Session"
          >
            End Session
          </button>
        </>
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
  const assessment = useConditionAssessment();

  // Guided inspection checklist state
  const [checklistSteps, setChecklistSteps] = useState<InspectionStep[]>(
    INSPECTION_STEPS.map((s) => ({ ...s, completed: false }))
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Rolling buffer of sampled frames (Base64 JPEG, no data: prefix) captured
  // during the session for multi-angle condition assessment.
  const frameBufferRef = useRef<string[]>([]);
  const MAX_BUFFERED_FRAMES = 6;

  // Track previous message count so we can detect new agent messages for TTS
  const prevMessageCountRef = useRef(0);

  // Capture a single frame from the video element as Base64 JPEG (no prefix).
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    return dataUrl.replace(/^data:image\/jpeg;base64,/, "");
  }, []);

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

  // Auto-guidance: periodically send vision context to Gemini so it can
  // proactively guide the user without them typing anything.
  const lastDetectionRef = useRef<DetectionPayload | null>(null);
  useEffect(() => {
    lastDetectionRef.current = detectionPayload;
  }, [detectionPayload]);

  // Keep a stable ref to the chat hook so the interval effect doesn't reset
  // on every render (detections update state ~10fps, causing constant renders).
  const triageChatRef = useRef(triageChat);
  useEffect(() => {
    triageChatRef.current = triageChat;
  }, [triageChat]);

  useEffect(() => {
    if (status !== "active") return;

    const AUTO_GUIDE_INTERVAL_MS = 10000; // every 10 seconds

    const interval = setInterval(() => {
      const chat = triageChatRef.current;
      if (chat.isLoading) return; // don't overlap with pending requests

      // If all checklist steps are complete, don't send more guidance
      const stepIdx = currentStepIndex;
      const steps = checklistSteps;
      if (stepIdx >= steps.length) return;

      const currentStep = steps[stepIdx];
      const payload = lastDetectionRef.current;

      // Build context with the current checklist instruction
      let context: string;
      if (!payload || payload.detections.length === 0) {
        context = `[Inspection step ${stepIdx + 1}/${steps.length}: ${currentStep.label}] ` +
          `I don't see any item in the frame yet. Ask the user: "${currentStep.instruction}"`;
      } else {
        const items = payload.detections
          .map((d) => `${d.label} (${(d.confidence * 100).toFixed(0)}%)`)
          .join(", ");
        context = `[Inspection step ${stepIdx + 1}/${steps.length}: ${currentStep.label}] ` +
          `I can see: ${items}. The current inspection step is "${currentStep.label}". ` +
          `Give a short instruction: "${currentStep.instruction}" or acknowledge if they've already done it and move to the next step.`;
      }

      chat.sendVisionContext(context);

      // Auto-advance the checklist step after each guidance round
      // (the user is being guided through each step sequentially)
      setChecklistSteps((prev) =>
        prev.map((s, i) => (i === stepIdx ? { ...s, completed: true } : s))
      );
      setCurrentStepIndex((prev) => Math.min(prev + 1, steps.length));
    }, AUTO_GUIDE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [status, currentStepIndex, checklistSteps]);

  // Frame sampling: every 2 seconds during an active session, capture a frame
  // into a rolling buffer (keeping the most recent MAX_BUFFERED_FRAMES) so we
  // have multiple angles of the product for the final condition assessment.
  useEffect(() => {
    if (status !== "active") return;

    const SAMPLE_INTERVAL_MS = 2000;

    const interval = setInterval(() => {
      const frame = captureFrame();
      if (!frame) return;
      const buf = frameBufferRef.current;
      buf.push(frame);
      if (buf.length > MAX_BUFFERED_FRAMES) {
        buf.shift(); // drop the oldest frame
      }
    }, SAMPLE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [status, captureFrame]);

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
    frameBufferRef.current = []; // reset captured frames for the new session
    assessment.reset();
    // Reset inspection checklist
    setChecklistSteps(INSPECTION_STEPS.map((s) => ({ ...s, completed: false })));
    setCurrentStepIndex(0);

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

  /**
   * Assess Condition: capture one final frame, then send all buffered frames
   * plus the chat history to Gemini Vision for a consolidated condition report.
   */
  const handleAssess = useCallback(async () => {
    // Grab one more current frame so we always have the latest angle
    const latest = captureFrame();
    const frames = [...frameBufferRef.current];
    if (latest) frames.push(latest);

    // De-duplicate accidental identical consecutive frames and cap the count
    const unique = frames.filter((f, i) => i === 0 || f !== frames[i - 1]);
    await assessment.assess(unique.slice(-6), triageChat.messages);
  }, [captureFrame, assessment, triageChat.messages]);

  return (
    <div className="triage-room">
      <div className="triage-room__layout">
        {/* Left panel: Video feed area */}
        <div className="triage-room__video-panel">
          {(status === "active" || status === "degraded") && (
            <InspectionChecklist
              steps={checklistSteps}
              currentStepIndex={currentStepIndex}
            />
          )}

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
          <ConditionReportPanel
            report={assessment.report}
            isAssessing={assessment.isAssessing}
            error={assessment.error}
          />
        </div>
      </div>

      <SessionControlsPanel
        status={status}
        error={error}
        isAssessing={assessment.isAssessing}
        onStart={handleStart}
        onEnd={handleEnd}
        onAssess={handleAssess}
      />
    </div>
  );
}
