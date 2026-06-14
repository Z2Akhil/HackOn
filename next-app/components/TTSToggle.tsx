"use client";

import { useTTS } from "../hooks/useTTS";

interface TTSToggleProps {
  /** External hook instance — if provided, the component won't create its own */
  tts?: ReturnType<typeof useTTS>;
}

/**
 * Mute/unmute toggle button for Text-to-Speech.
 * Renders "🔊" when unmuted, "🔇" when muted.
 * Only renders if Web Speech API is supported.
 */
export default function TTSToggle({ tts: externalTts }: TTSToggleProps) {
  const internalTts = useTTS();
  const { isMuted, isSupported, toggleMute } = externalTts ?? internalTts;

  if (!isSupported) {
    return null;
  }

  return (
    <button
      className="tts-toggle"
      onClick={toggleMute}
      aria-label={isMuted ? "Unmute text-to-speech" : "Mute text-to-speech"}
      aria-pressed={!isMuted}
      title={isMuted ? "Unmute" : "Mute"}
      type="button"
    >
      {isMuted ? "🔇" : "🔊"}
    </button>
  );
}
