"use client";

import { ConditionReport } from "../hooks/useConditionAssessment";

interface ConditionReportPanelProps {
  report: ConditionReport | null;
  isAssessing: boolean;
  error: string | null;
}

function conditionColor(condition: string): string {
  switch (condition) {
    case "like_new":
      return "#00b894";
    case "used_good":
      return "#00cec9";
    case "used_with_damage":
      return "#fdcb6e";
    case "heavily_damaged":
      return "#e74c3c";
    default:
      return "#888";
  }
}

function severityColor(severity: string): string {
  switch (severity) {
    case "minor":
      return "#fdcb6e";
    case "moderate":
      return "#e67e22";
    case "severe":
      return "#e74c3c";
    default:
      return "#888";
  }
}

function formatLabel(s: string): string {
  return s.replace(/_/g, " ");
}

export default function ConditionReportPanel({
  report,
  isAssessing,
  error,
}: ConditionReportPanelProps) {
  if (!isAssessing && !report && !error) return null;

  const handleDownload = () => {
    if (!report) return;
    const json = JSON.stringify(report, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `condition-report-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="condition-report" aria-live="polite">
      {isAssessing && (
        <div className="condition-report__loading">
          <span className="chat-panel__typing-dot" />
          <span>Analyzing captured angles…</span>
        </div>
      )}

      {error && !isAssessing && (
        <div className="condition-report__error" role="alert">
          {error}
        </div>
      )}

      {report && !isAssessing && (
        <div className="condition-report__card">
          <div className="condition-report__header">
            <span className="condition-report__item">{report.item || "Item"}</span>
            <span
              className="condition-report__badge"
              style={{ background: conditionColor(report.overall_condition) }}
            >
              {formatLabel(report.overall_condition)}
            </span>
          </div>

          {report.summary && (
            <p className="condition-report__summary">{report.summary}</p>
          )}

          <div className="condition-report__defects">
            <strong>Defects ({report.defects?.length || 0})</strong>
            {report.defects && report.defects.length > 0 ? (
              <ul>
                {report.defects.map((d, i) => (
                  <li key={i}>
                    <span
                      className="condition-report__severity-dot"
                      style={{ background: severityColor(d.severity) }}
                    />
                    <span className="condition-report__defect-type">{formatLabel(d.type)}</span>
                    <span className="condition-report__defect-loc"> — {d.location}</span>
                    <span className="condition-report__defect-sev"> ({d.severity})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="condition-report__nodefects">No visible defects detected.</p>
            )}
          </div>

          <div className="condition-report__extras">
            <div className="condition-report__extra-item">
              <span className="condition-report__extra-label">Packaging:</span>
              <span className="condition-report__extra-value">
                {formatLabel(report.packaging_status || "unknown")}
              </span>
            </div>
            <div className="condition-report__extra-item">
              <span className="condition-report__extra-label">Accessories:</span>
              <span className="condition-report__extra-value">
                {report.accessories_complete === true
                  ? "✓ Complete"
                  : report.accessories_complete === false
                  ? "✗ Incomplete/Missing"
                  : "Unknown"}
              </span>
            </div>
          </div>

          <div className="condition-report__footer">
            <span>
              Recommendation: <strong>{formatLabel(report.recommendation)}</strong>
            </span>
            <span>Angles reviewed: {report.angles_reviewed}</span>
            <span>Confidence: {(report.confidence * 100).toFixed(0)}%</span>
          </div>

          <button
            className="btn-download-report"
            onClick={handleDownload}
            aria-label="Download condition report as JSON"
          >
            📥 Download Report
          </button>
        </div>
      )}
    </div>
  );
}
