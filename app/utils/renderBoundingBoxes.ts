import { DetectionPayload } from "../hooks/useFrameStreamer";

/**
 * Renders bounding boxes from a DetectionPayload onto an HTML canvas element.
 *
 * Clears the canvas on every call. If payload is null or has no detections,
 * the canvas is left cleared. Otherwise, scales each bounding box from the
 * original frame resolution to the canvas display dimensions and draws
 * red rectangles with labels.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
export function renderBoundingBoxes(
  canvas: HTMLCanvasElement,
  payload: DetectionPayload | null,
  frameWidth: number,
  frameHeight: number
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Clear the entire canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // If no payload or empty detections, leave canvas clear
  if (!payload || payload.detections.length === 0) {
    return;
  }

  // Calculate scale factors from frame resolution to canvas dimensions
  const scaleX = canvas.width / frameWidth;
  const scaleY = canvas.height / frameHeight;

  for (const detection of payload.detections) {
    const [x1, y1, x2, y2] = detection.bbox;

    // Scale coordinates to canvas dimensions
    const scaledX = x1 * scaleX;
    const scaledY = y1 * scaleY;
    const scaledWidth = (x2 - x1) * scaleX;
    const scaledHeight = (y2 - y1) * scaleY;

    // Draw bounding box rectangle
    ctx.strokeStyle = "#FF0000";
    ctx.lineWidth = 2;
    ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

    // Prepare label text
    const labelText = `${detection.label} ${detection.confidence.toFixed(2)}`;

    // Draw label background and text at top-left corner of bbox
    ctx.font = "14px sans-serif";
    const textMetrics = ctx.measureText(labelText);
    const textHeight = 14;
    const padding = 4;
    const bgWidth = textMetrics.width + padding * 2;
    const bgHeight = textHeight + padding * 2;

    // Dark background rectangle
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(scaledX, scaledY - bgHeight, bgWidth, bgHeight);

    // White text
    ctx.fillStyle = "white";
    ctx.textBaseline = "bottom";
    ctx.fillText(labelText, scaledX + padding, scaledY - padding);
  }
}
