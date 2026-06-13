import { useState, useCallback } from "react";
import { ChatMessage } from "./useTriageChat";

export interface Defect {
  type: string;
  location: string;
  severity: string;
}

export interface ConditionReport {
  item: string;
  overall_condition: string;
  defects: Defect[];
  packaging_status: string;
  accessories_complete: boolean | null;
  angles_reviewed: number;
  recommendation: string;
  summary: string;
  confidence: number;
}

interface UseConditionAssessmentReturn {
  report: ConditionReport | null;
  isAssessing: boolean;
  error: string | null;
  assess: (frames: string[], history: ChatMessage[]) => Promise<void>;
  reset: () => void;
}

export function useConditionAssessment(): UseConditionAssessmentReturn {
  const [report, setReport] = useState<ConditionReport | null>(null);
  const [isAssessing, setIsAssessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assess = useCallback(async (frames: string[], history: ChatMessage[]) => {
    if (frames.length === 0) {
      setError("No frames were captured during the session. Try rotating the item while the session is active.");
      return;
    }

    setIsAssessing(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch("/api/triage/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frames, history }),
      });

      const data = await res.json();

      if (res.ok && data.condition) {
        setReport(data.condition as ConditionReport);
      } else {
        setError(data.error || "Failed to assess condition");
      }
    } catch {
      setError("Network error. Failed to reach the assessment service.");
    } finally {
      setIsAssessing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setReport(null);
    setError(null);
  }, []);

  return { report, isAssessing, error, assess, reset };
}
