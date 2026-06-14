"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UseTTSReturn {
  isMuted: boolean;
  isSupported: boolean;
  toggleMute: () => void;
  speak: (text: string) => void;
  stop: () => void;
}

/**
 * Custom hook for Text-to-Speech using the Web Speech API.
 *
 * - On mount: checks if `window.speechSynthesis` exists, sets `isSupported`
 * - speak(text): if muted or not supported, returns. Calls cancel() first, then speaks.
 * - toggleMute(): flips muted state. If becoming muted, also cancels current speech.
 * - stop(): cancels current utterance.
 * - On unmount: cancels any in-progress speech.
 */
export function useTTS(): UseTTSReturn {
  const [isMuted, setIsMuted] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const isMutedRef = useRef(isMuted);

  // Keep the ref in sync with state so callbacks always see latest value
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Check for Web Speech API support on mount
  useEffect(() => {
    const supported =
      typeof window !== "undefined" && "speechSynthesis" in window;
    setIsSupported(supported);

    // Cleanup: cancel any speech on unmount
    return () => {
      if (supported) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported || isMutedRef.current) {
        return;
      }

      // Cancel any previous utterance before speaking new one
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    },
    [isSupported]
  );

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
    }
  }, [isSupported]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const newMuted = !prev;
      // If becoming muted, cancel any current speech
      if (newMuted && isSupported) {
        window.speechSynthesis.cancel();
      }
      return newMuted;
    });
  }, [isSupported]);

  return {
    isMuted,
    isSupported,
    toggleMute,
    speak,
    stop,
  };
}
