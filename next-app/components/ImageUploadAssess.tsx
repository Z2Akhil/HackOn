"use client";

import { useState, useCallback, useRef } from "react";
import ConditionReportPanel from "./ConditionReportPanel";
import { useConditionAssessment } from "../hooks/useConditionAssessment";

const MAX_IMAGES = 6;
const MAX_FILE_SIZE_MB = 5;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data:image/...;base64, prefix
      const base64 = result.replace(/^data:image\/\w+;base64,/, "");
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ImageUploadAssess() {
  const [previews, setPreviews] = useState<string[]>([]); // data URLs for display
  const [base64Frames, setBase64Frames] = useState<string[]>([]); // raw base64 for API
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const assessment = useConditionAssessment();

  const processFiles = useCallback(async (files: FileList | File[]) => {
    setUploadError(null);
    const fileArray = Array.from(files);

    // Validate
    const imageFiles = fileArray.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      setUploadError("Please select image files (JPEG, PNG, etc.).");
      return;
    }

    const totalAllowed = MAX_IMAGES - previews.length;
    if (totalAllowed <= 0) {
      setUploadError(`Maximum ${MAX_IMAGES} images allowed. Remove some to add more.`);
      return;
    }

    const toProcess = imageFiles.slice(0, totalAllowed);
    const oversized = toProcess.filter((f) => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);
    if (oversized.length > 0) {
      setUploadError(`Some files exceed ${MAX_FILE_SIZE_MB}MB and were skipped.`);
    }

    const valid = toProcess.filter((f) => f.size <= MAX_FILE_SIZE_MB * 1024 * 1024);

    const newPreviews: string[] = [];
    const newBase64: string[] = [];

    for (const file of valid) {
      const b64 = await fileToBase64(file);
      newBase64.push(b64);
      newPreviews.push(`data:${file.type};base64,${b64}`);
    }

    setPreviews((prev) => [...prev, ...newPreviews]);
    setBase64Frames((prev) => [...prev, ...newBase64]);
  }, [previews.length]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      e.target.value = ""; // reset so same file can be re-selected
    }
  }, [processFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const removeImage = useCallback((index: number) => {
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    setBase64Frames((prev) => prev.filter((_, i) => i !== index));
    assessment.reset();
  }, [assessment]);

  const handleAssess = useCallback(async () => {
    if (base64Frames.length === 0) {
      setUploadError("Upload at least one image to assess.");
      return;
    }
    await assessment.assess(base64Frames, []);
  }, [base64Frames, assessment]);

  const handleReset = useCallback(() => {
    setPreviews([]);
    setBase64Frames([]);
    setUploadError(null);
    assessment.reset();
  }, [assessment]);

  return (
    <div className="upload-assess">
      <div className="upload-assess__content">
        {/* Drop zone */}
        <div
          className={`upload-assess__dropzone ${dragActive ? "upload-assess__dropzone--active" : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload images by clicking or dragging"
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInput}
            style={{ display: "none" }}
          />
          <p className="upload-assess__dropzone-text">
            📷 Drag &amp; drop images here, or click to browse
          </p>
          <p className="upload-assess__dropzone-hint">
            Up to {MAX_IMAGES} images, max {MAX_FILE_SIZE_MB}MB each (JPEG, PNG)
          </p>
        </div>

        {uploadError && (
          <div className="upload-assess__error" role="alert">{uploadError}</div>
        )}

        {/* Image previews */}
        {previews.length > 0 && (
          <div className="upload-assess__previews">
            {previews.map((src, i) => (
              <div key={i} className="upload-assess__preview-item">
                <img src={src} alt={`Upload ${i + 1}`} />
                <button
                  className="upload-assess__remove-btn"
                  onClick={() => removeImage(i)}
                  aria-label={`Remove image ${i + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {previews.length > 0 && (
          <div className="upload-assess__actions">
            <button
              className="btn-assess"
              onClick={handleAssess}
              disabled={assessment.isAssessing}
            >
              {assessment.isAssessing ? "Assessing…" : `Assess Condition (${previews.length} image${previews.length > 1 ? "s" : ""})`}
            </button>
            <button className="btn-reset" onClick={handleReset}>
              Clear All
            </button>
          </div>
        )}

        {/* Condition Report */}
        <ConditionReportPanel
          report={assessment.report}
          isAssessing={assessment.isAssessing}
          error={assessment.error}
        />
      </div>
    </div>
  );
}
