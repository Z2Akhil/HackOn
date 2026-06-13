# Implementation Plan: Live Vision & Voice Triage Room

## Overview

This plan implements the Live Triage Room feature across three layers: a Python FastAPI vision microservice with WebSocket-based YOLOv8 defect detection, a Next.js API route for Gemini chat proxying, and a React frontend with webcam feed, bounding box overlays, chat panel with TTS, and session lifecycle management. Tasks are ordered to build infrastructure first, then core logic, and finally wire everything together.

## Tasks

- [ ] 1. Vision Service WebSocket Endpoint
  - [ ] 1.1 Add YOLOv8 dependencies and model loading to ml-service
    - Add `ultralytics` and `opencv-python-headless` to `ml-service/requirements.txt`
    - Add model loading logic that reads `YOLO_MODEL_PATH` env var (default: `yolov8n.pt`)
    - Fail startup with logged error if model path is invalid or file not found
    - _Requirements: 1.6, 1.7_

  - [ ] 1.2 Implement `/vision-stream` WebSocket endpoint with frame processing
    - Add WebSocket endpoint at `/vision-stream` in `ml-service/main.py`
    - Accept WebSocket connections, validate Origin header against allowed origins
    - Decode incoming Base64 text messages as JPEG using OpenCV
    - Validate frame size ≤ 5MB encoded, valid Base64, valid JPEG
    - Return `{"error": "..."}` for invalid frames without closing connection
    - Run YOLOv8 inference on decoded frame
    - Return `DetectionPayload` JSON with `detections` array, `frame_width`, `frame_height`
    - Return empty `detections` array when no defects found
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 1.3 Implement frame-skip strategy and performance logging
    - Process only the most recently received frame when frames arrive faster than inference
    - Discard older unprocessed frames to prevent queue buildup
    - Log a warning when frame processing exceeds 500ms
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 1.4 Configure CORS/Origin validation for Vision Service
    - Read `ALLOWED_ORIGINS` env var (comma-separated), default to `http://localhost:3000`
    - Accept WebSocket upgrades only from allowed origins
    - Reject connections from non-allowed origins
    - _Requirements: 10.1, 10.3, 10.4, 10.5_

  - [ ]* 1.5 Write property tests for Vision Service (Properties 1, 2, 3)
    - Create `ml-service/tests/test_vision_props.py` using `hypothesis`
    - **Property 1: Frame processing pipeline produces valid output** — generate random valid JPEG images, mock YOLO inference, assert response conforms to DetectionPayload schema
    - **Property 2: Invalid frame rejection preserves connection** — generate random invalid inputs (bad Base64, non-JPEG, oversized), assert error JSON returned and connection stays open
    - **Property 3: Stateless frame processing** — process same frame after varying sequences of other frames, assert identical output
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 2.2**

  - [ ]* 1.6 Write property test for Origin validation (Property 11 - Python)
    - Add to `ml-service/tests/test_cors_props.py` using `hypothesis`
    - **Property 11: Origin validation** — generate random origin strings and ALLOWED_ORIGINS lists, assert acceptance iff exact match
    - **Validates: Requirements 10.1, 10.3, 10.4, 10.5**

- [ ] 2. Checkpoint - Ensure Vision Service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Backend Gateway Chat Endpoint
  - [ ] 3.1 Create Next.js API route for triage chat
    - Create `app/app/api/triage/chat/route.ts`
    - Implement `POST` handler that accepts `{message, history, start?}` body
    - Validate request body: require `message` and `history` fields, correct types
    - Enforce `history` max 50 entries, `message` max 2000 characters
    - Return HTTP 400 with `{error: "..."}` for validation failures
    - _Requirements: 3.1, 3.7, 3.8_

  - [ ] 3.2 Implement Gemini API integration with system prompt
    - Install `@google/generative-ai` package
    - Configure Gemini with triage agent system prompt
    - Forward conversation history and new message to Gemini API
    - Handle `start: true` requests by generating opening greeting
    - Return HTTP 200 with `{response: string}` on success
    - Return HTTP 502 with `{error: "..."}` on Gemini timeout (30s) or failure
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ] 3.3 Configure CORS for Backend Gateway
    - Add CORS middleware for `/api/triage/chat` endpoint
    - Read `ALLOWED_ORIGINS` env var, default to `http://localhost:3000`
    - Allow POST method and respond to preflight OPTIONS requests
    - Reject requests from non-allowed origins
    - _Requirements: 10.2, 10.3, 10.4, 10.5_

  - [ ]* 3.4 Write property tests for chat validation and response (Properties 4, 5)
    - Create `app/__tests__/triage-chat.prop.test.ts` using `fast-check`
    - **Property 4: Chat input validation rejects malformed requests** — generate objects with missing fields, wrong types, oversized data, assert HTTP 400 with error field
    - **Property 5: Chat response wrapping** — generate valid requests with mocked Gemini responses, assert HTTP 200 with response field
    - **Validates: Requirements 3.4, 3.7, 3.8**

  - [ ]* 3.5 Write property test for Origin validation (Property 11 - TypeScript)
    - Create `app/__tests__/cors.prop.test.ts` using `fast-check`
    - **Property 11: Origin validation** — generate random origin strings and allowed-origins lists, assert acceptance iff exact match
    - **Validates: Requirements 10.2, 10.3, 10.4, 10.5**

- [ ] 4. Checkpoint - Ensure Backend Gateway tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Triage Room UI - Video and Canvas Foundation
  - [ ] 5.1 Create TriageRoom page and layout component
    - Create `app/app/triage/page.tsx` as the triage route
    - Create `app/components/TriageRoom.tsx` with left (video) + right (chat) layout
    - Implement session state machine: idle → initializing → active → degraded
    - Implement `SessionControls` with Start/End buttons based on session state
    - _Requirements: 9.1, 9.2, 9.4_

  - [ ] 5.2 Implement VideoFeed component with webcam access
    - Create `app/components/VideoFeed.tsx`
    - Request webcam via `navigator.mediaDevices.getUserMedia` with min 640x480 resolution
    - Display loading indicator during camera initialization
    - Display live stream in `<video>` element
    - Show error message if camera permission denied or device unavailable
    - Handle unexpected camera disconnection mid-session
    - _Requirements: 4.1, 4.2, 4.5_

  - [ ] 5.3 Implement canvas overlay with resize synchronization
    - Add `<canvas>` element positioned over `<video>` in VideoFeed component
    - Set canvas width/height to exactly match video element display dimensions
    - Add resize observer to recalculate canvas dimensions on viewport changes
    - Maintain 1:1 pixel mapping between video and canvas
    - _Requirements: 4.3, 4.4_

  - [ ]* 5.4 Write property test for canvas-video dimension sync (Property 7)
    - Create `app/__tests__/video-canvas.prop.test.ts` using `fast-check`
    - **Property 7: Canvas-video dimension synchronization** — generate random viewport dimensions, assert canvas matches video display size
    - **Validates: Requirements 4.3, 4.4**

- [ ] 6. Triage Room UI - Frame Streaming and Bounding Boxes
  - [ ] 6.1 Implement FrameStreamer with WebSocket transmission
    - Create `app/components/FrameStreamer.tsx` (or hook `useFrameStreamer`)
    - Capture frames from video at 10fps using `setInterval` / `requestAnimationFrame`
    - Encode frames as Base64 JPEG with quality 0.7
    - Open WebSocket to `ws://localhost:8000/vision-stream` and send frames
    - Stop frame capture and close WebSocket on session end
    - Show non-blocking visual indicator when WebSocket disconnects (degraded mode)
    - Do not attempt automatic reconnection
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 6.2 Implement BoundingBoxRenderer on canvas
    - Create `app/components/BoundingBoxRenderer.tsx` (or utility function)
    - Clear canvas on each new DetectionPayload
    - Scale bounding box coordinates from frame resolution to canvas dimensions
    - Draw rectangles with red (#FF0000) stroke, 2px line width
    - Render label + confidence (e.g., "scratch 0.87") as white text on dark background at top-left of each box
    - Clear canvas when detections array is empty
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 6.3 Write property test for bounding box rendering (Property 6)
    - Create `app/__tests__/bbox-render.prop.test.ts` using `fast-check`
    - **Property 6: Bounding box rendering correctness** — generate random DetectionPayloads and frame/canvas dimensions, assert coordinates are scaled correctly and styling is applied
    - **Validates: Requirements 6.1, 6.2, 6.3**

- [ ] 7. Triage Room UI - Chat Panel and TTS
  - [ ] 7.1 Implement ChatPanel component
    - Create `app/components/ChatPanel.tsx`
    - Display message list with sender role labels ("You" / "Agent")
    - Add chat input field with Enter key and Send button submission
    - Show typing indicator (animated dots) while awaiting response
    - Disable input during pending requests
    - Auto-scroll to latest message on new messages
    - Display inline error with retry on failed requests
    - _Requirements: 7.1, 7.3, 7.4, 7.5, 7.6_

  - [ ] 7.2 Implement chat API integration
    - Send start request `{start: true, history: [], message: ""}` on session start
    - Send full conversation history + new message on each user submission
    - Append user message and agent response to chat history state
    - Handle HTTP 400/502 errors with inline retry UI
    - _Requirements: 7.2, 7.3, 7.5_

  - [ ] 7.3 Implement TTSController with mute toggle
    - Create `app/components/TTSController.tsx` (or hook `useTTS`)
    - Use `speechSynthesis.speak()` on each new agent response
    - Cancel previous utterance via `speechSynthesis.cancel()` before speaking new one
    - Implement mute/unmute toggle button — suppress speech when muted
    - Show one-time info message if Web Speech API unavailable
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 7.4 Write property tests for chat history and TTS (Properties 8, 9)
    - Create `app/__tests__/chat-history.prop.test.ts` using `fast-check`
    - **Property 8: Chat history accumulation** — generate random conversation histories + new messages, assert correct POST body and N+2 displayed messages
    - **Validates: Requirements 7.3**
    - Create `app/__tests__/tts.prop.test.ts` using `fast-check`
    - **Property 9: TTS utterance management** — generate random response sequences with mute states, assert cancel-before-speak behavior and mute suppression
    - **Validates: Requirements 8.1, 8.2, 8.4**

- [ ] 8. Triage Room UI - Session Lifecycle Wiring
  - [ ] 8.1 Wire full session start flow
    - On "Start Session" click: acquire camera → open WebSocket → send chat start request
    - Transition to active state only when all three succeed
    - On partial failure: release acquired resources, show error indicating which step failed, return to idle
    - Replace Start button with End button on success
    - _Requirements: 9.2, 9.3_

  - [ ] 8.2 Wire full session end flow
    - On "End Session" click: stop frame capture → close WebSocket → stop camera stream → clear canvas
    - Retain chat history on screen after session ends
    - Restore Start button for new session
    - _Requirements: 9.4, 9.5, 9.6_

  - [ ]* 8.3 Write property test for session cleanup on partial failure (Property 10)
    - Create `app/__tests__/session-lifecycle.prop.test.ts` using `fast-check`
    - **Property 10: Session initiation cleanup on partial failure** — generate random failure points (camera, WS, chat), assert all preceding resources released and UI returns to idle
    - **Validates: Requirements 9.3**

- [ ] 9. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The Vision Service (Python) uses `hypothesis` for property tests
- The Frontend/Backend Gateway (TypeScript) uses `fast-check` for property tests
- The design uses specific languages: Python for Vision_Service, TypeScript for Backend Gateway and Frontend

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "3.1", "5.1"] },
    { "id": 1, "tasks": ["1.2", "1.4", "3.2", "3.3", "5.2"] },
    { "id": 2, "tasks": ["1.3", "1.5", "1.6", "3.4", "3.5", "5.3"] },
    { "id": 3, "tasks": ["5.4", "6.1", "7.1"] },
    { "id": 4, "tasks": ["6.2", "7.2", "7.3"] },
    { "id": 5, "tasks": ["6.3", "7.4", "8.1"] },
    { "id": 6, "tasks": ["8.2", "8.3"] }
  ]
}
```
