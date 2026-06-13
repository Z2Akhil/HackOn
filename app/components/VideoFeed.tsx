"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface VideoFeedProps {
  isActive: boolean;
  onStreamReady?: (stream: MediaStream) => void;
  onStreamError?: (error: string) => void;
  onStreamLost?: () => void;
  videoRef?: React.RefObject<HTMLVideoElement>;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}

type CameraState = "idle" | "loading" | "streaming" | "error";

export default function VideoFeed({
  isActive,
  onStreamReady,
  onStreamError,
  onStreamLost,
  videoRef: externalVideoRef,
  canvasRef: externalCanvasRef,
}: VideoFeedProps) {
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const videoElement = externalVideoRef || internalVideoRef;
  const canvasElement = externalCanvasRef || internalCanvasRef;

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.removeEventListener("ended", handleTrackEnded);
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoElement.current) {
      videoElement.current.srcObject = null;
    }
  }, [videoElement]);

  function handleTrackEnded() {
    setCameraState("error");
    setErrorMessage("Camera connection was lost. The device may have been disconnected.");
    stopStream();
    onStreamLost?.();
  }

  const startCamera = useCallback(async () => {
    setCameraState("loading");
    setErrorMessage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { min: 640 },
          height: { min: 480 },
        },
      });

      streamRef.current = stream;

      // Listen for unexpected track endings (camera disconnection)
      stream.getVideoTracks().forEach((track) => {
        track.addEventListener("ended", handleTrackEnded);
      });

      if (videoElement.current) {
        videoElement.current.srcObject = stream;
      }

      setCameraState("streaming");
      onStreamReady?.(stream);
    } catch (err) {
      let message = "Failed to access camera.";

      if (err instanceof DOMException) {
        switch (err.name) {
          case "NotAllowedError":
            message =
              "Camera access was denied. Please grant camera permission and try again.";
            break;
          case "NotFoundError":
            message =
              "No camera device found. Please connect a camera and try again.";
            break;
          case "NotReadableError":
            message =
              "Camera is already in use by another application. Please close other apps using the camera.";
            break;
          case "OverconstrainedError":
            message =
              "Camera does not support the required resolution (minimum 640x480).";
            break;
          default:
            message = `Camera error: ${err.message}`;
        }
      } else if (err instanceof Error) {
        message = `Camera error: ${err.message}`;
      }

      setCameraState("error");
      setErrorMessage(message);
      onStreamError?.(message);
    }
  }, [videoElement, onStreamReady, onStreamError, onStreamLost]);

  // Sync canvas dimensions with video display dimensions using ResizeObserver
  useEffect(() => {
    const video = videoElement.current;
    const canvas = canvasElement.current;
    if (!video || !canvas) return;

    const syncCanvasSize = () => {
      const width = video.clientWidth;
      const height = video.clientHeight;
      if (width > 0 && height > 0) {
        canvas.width = width;
        canvas.height = height;
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      syncCanvasSize();
    });

    resizeObserver.observe(video);

    // Initial sync
    syncCanvasSize();

    return () => {
      resizeObserver.disconnect();
    };
  }, [videoElement, canvasElement, cameraState]);

  // Start/stop camera based on isActive prop
  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      stopStream();
      setCameraState("idle");
      setErrorMessage(null);
    }

    return () => {
      stopStream();
    };
  }, [isActive]);

  return (
    <div className="video-feed" aria-label="Video feed">
      {cameraState === "loading" && (
        <div className="video-feed__loading" role="status" aria-live="polite">
          <div className="video-feed__spinner" aria-hidden="true" />
          <p>Initializing camera…</p>
        </div>
      )}

      {cameraState === "error" && errorMessage && (
        <div className="video-feed__error" role="alert" aria-live="assertive">
          <p>{errorMessage}</p>
        </div>
      )}

      <div
        className="video-feed__container"
        style={{ position: "relative", display: cameraState === "streaming" ? "block" : "none" }}
      >
        <video
          ref={videoElement}
          className="video-feed__video"
          autoPlay
          playsInline
          muted
          style={{ display: "block", width: "100%" }}
          aria-label="Live camera feed"
        />
        <canvas
          ref={canvasElement}
          className="video-feed__canvas"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            pointerEvents: "none",
          }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
