"use client";

import { useState } from "react";
import TriageRoom from "@/components/TriageRoom";
import ImageUploadAssess from "@/components/ImageUploadAssess";

type TriageMode = "live" | "upload";

export default function TriagePage() {
  const [mode, setMode] = useState<TriageMode>("live");

  return (
    <main className="triage-page">
      <div className="triage-mode-toggle">
        <button
          className={`triage-mode-btn ${mode === "live" ? "triage-mode-btn--active" : ""}`}
          onClick={() => setMode("live")}
        >
          🎥 Live Session
        </button>
        <button
          className={`triage-mode-btn ${mode === "upload" ? "triage-mode-btn--active" : ""}`}
          onClick={() => setMode("upload")}
        >
          📤 Upload Images
        </button>
      </div>

      {mode === "live" && <TriageRoom />}
      {mode === "upload" && <ImageUploadAssess />}
    </main>
  );
}
