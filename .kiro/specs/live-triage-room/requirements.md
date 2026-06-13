# Requirements Document

## Introduction

The Live Vision & Voice Triage Room is the flagship UX feature of ReLoop. It replaces standard static image uploads with a live webcam video feed where a conversational AI agent (powered by Google Gemini) guides the user through a real-time product inspection. Simultaneously, a Python/YOLO vision microservice processes video frames and returns defect bounding boxes rendered as live overlays on the frontend canvas. The feature spans three components: a Python FastAPI vision microservice, a Node.js/Express backend gateway for Gemini chat, and a React/Next.js frontend Triage Room UI.

## Glossary

- **Vision_Service**: The Python FastAPI microservice responsible for receiving video frames and running YOLO inference to detect product defects.
- **Backend_Gateway**: The Node.js/Express server that proxies chat messages between the frontend and the Google Gemini API.
- **Triage_Room_UI**: The React component in the Next.js frontend that provides the webcam feed, bounding box canvas overlay, and chat interface.
- **Frame**: A single image captured from the user's webcam, encoded as Base64 JPEG.
- **Bounding_Box**: A rectangular region defined by coordinates [x1, y1, x2, y2] indicating a detected defect location on a frame.
- **Defect_Detection_Payload**: A JSON object returned by the Vision_Service containing an array of detections, each with bounding box coordinates, class label, and confidence score.
- **Triage_Session**: The period from when a user clicks "Start Session" to when the inspection concludes, encompassing the full video and chat interaction.
- **Gemini_Agent**: The Google Gemini API configured with a system prompt to act as an Amazon Returns Triage Agent that guides users through product inspection.
- **Frame_Capture_Rate**: The frequency at which the Triage_Room_UI captures and transmits frames to the Vision_Service, targeted at approximately 10 frames per second.

## Requirements

### Requirement 1: Vision Service WebSocket Endpoint

**User Story:** As a frontend client, I want to send live video frames to the Vision_Service over a WebSocket connection, so that I can receive real-time defect detection results without HTTP overhead per frame.

#### Acceptance Criteria

1. THE Vision_Service SHALL expose a WebSocket endpoint at the path `/vision-stream`.
2. WHEN the Vision_Service receives a WebSocket text message containing a Base64-encoded JPEG Frame of no more than 5 MB in encoded size, THE Vision_Service SHALL decode the frame using OpenCV and run YOLOv8 inference on the decoded image.
3. WHEN inference completes on a frame, THE Vision_Service SHALL return a JSON Defect_Detection_Payload containing an array of detections, where each detection includes bounding box coordinates as [x1, y1, x2, y2] with non-negative integer values bounded by the frame's pixel dimensions, a class label string of at most 64 characters, and a confidence score between 0.0 and 1.0.
4. WHEN no defects are detected in a frame, THE Vision_Service SHALL return a Defect_Detection_Payload with an empty detections array.
5. IF the Vision_Service receives a frame that is not valid Base64, not a decodable JPEG image, or exceeds 5 MB in encoded size, THEN THE Vision_Service SHALL return a JSON message on the WebSocket with an `error` field indicating the reason for rejection and SHALL continue accepting subsequent frames without closing the connection.
6. THE Vision_Service SHALL use the `yolov8n.pt` model by default and support swapping to a custom-trained model via an environment variable `YOLO_MODEL_PATH`.
7. IF the `YOLO_MODEL_PATH` environment variable references a file that does not exist or cannot be loaded as a valid YOLO model, THEN THE Vision_Service SHALL fail to start and log an error message indicating the invalid model path.

### Requirement 2: Vision Service Frame Processing Performance

**User Story:** As a system operator, I want frame processing to be fast enough for a responsive user experience, so that users see near-real-time bounding box overlays during their triage session.

#### Acceptance Criteria

1. THE Vision_Service SHALL process each received frame and return the Defect_Detection_Payload within 200 milliseconds under typical single-client load on a machine with at least 4 CPU cores and 8 GB RAM.
2. THE Vision_Service SHALL process frames independently and statelessly, requiring no memory of previously processed frames to handle the current frame.
3. WHILE the Vision_Service is processing one frame, THE Vision_Service SHALL continue accepting incoming frames on the WebSocket without blocking the connection; if frames arrive faster than they can be processed, the Vision_Service SHALL process the most recently received frame and discard older unprocessed frames.
4. IF frame processing exceeds 500 milliseconds for any single frame, THE Vision_Service SHALL log a warning including the processing duration.

### Requirement 3: Backend Gateway Chat Endpoint

**User Story:** As a frontend client, I want to send chat messages to the Backend_Gateway and receive AI-guided triage responses, so that the Gemini_Agent can instruct the user during the inspection session.

#### Acceptance Criteria

1. THE Backend_Gateway SHALL expose a REST API endpoint at `POST /api/triage/chat`.
2. WHEN the Backend_Gateway receives a request containing a `history` array of conversation entries (each with `role` and `content` fields) and a `message` string field, THE Backend_Gateway SHALL forward the conversation to the Google Gemini API with the configured triage system prompt.
3. THE Backend_Gateway SHALL configure the Gemini_Agent system prompt to instruct the AI to act as an Amazon Returns Triage Agent that asks users to show the item, rotate it, and point out defects in short conversational sentences.
4. WHEN the Gemini API returns a response, THE Backend_Gateway SHALL return HTTP 200 with the AI response text in a JSON body with a `response` field.
5. IF the Gemini API call fails or does not respond within 30 seconds, THEN THE Backend_Gateway SHALL return an HTTP 502 response with a JSON body containing an `error` field describing the failure.
6. WHEN the Backend_Gateway receives a request with the `start` field set to true and an empty `history` array, THE Backend_Gateway SHALL initiate the conversation by requesting the Gemini_Agent to produce an opening greeting that asks the user to show their product.
7. IF the request body is missing required fields (`message` or `history`) or contains invalid types, THEN THE Backend_Gateway SHALL return an HTTP 400 response with a JSON body containing an `error` field describing the validation failure.
8. THE Backend_Gateway SHALL accept a maximum conversation `history` of 50 entries and a maximum `message` length of 2000 characters; requests exceeding these limits SHALL receive an HTTP 400 response.

### Requirement 4: Webcam Access and Video Display

**User Story:** As a user initiating a triage session, I want the Triage_Room_UI to access my webcam and display the live video feed, so that I can show my product to the system for inspection.

#### Acceptance Criteria

1. WHEN the user clicks the "Start Session" button, THE Triage_Room_UI SHALL request webcam access using `navigator.mediaDevices.getUserMedia` with a minimum resolution constraint of 640x480 pixels, display a loading indicator while the camera initializes, and display the live video stream in a `<video>` HTML element once the stream is available.
2. IF the user denies camera permission, the browser does not support `getUserMedia`, or no camera device is available, THEN THE Triage_Room_UI SHALL display an error message within the Triage Room view area informing the user that camera access is required for the triage session, and the "Start Session" button SHALL remain available for retry.
3. THE Triage_Room_UI SHALL render a `<canvas>` element overlaid on top of the `<video>` element, positioned and sized to exactly match the video display dimensions in pixels for accurate bounding box mapping.
4. WHEN the video element resizes due to viewport changes, THE Triage_Room_UI SHALL recalculate and update the canvas width and height to equal the video element's displayed width and height.
5. IF the camera stream ends unexpectedly during an active Triage_Session (e.g., device disconnected), THEN THE Triage_Room_UI SHALL display an error message within the Triage Room view area indicating the camera connection was lost, stop frame capture, and close the Vision_Service WebSocket connection.

### Requirement 5: Frame Capture and WebSocket Transmission

**User Story:** As the Triage_Room_UI, I want to continuously capture frames from the webcam and transmit them to the Vision_Service, so that defect detection runs on a live feed.

#### Acceptance Criteria

1. WHILE a Triage_Session is active, THE Triage_Room_UI SHALL capture frames from the video feed at a rate between 8 and 12 frames per second (target 10 fps) and encode each frame as Base64 JPEG with a quality setting of 0.7.
2. WHILE a Triage_Session is active, THE Triage_Room_UI SHALL transmit each captured frame to the Vision_Service via a WebSocket connection to `ws://localhost:8000/vision-stream`.
3. IF the WebSocket connection to the Vision_Service fails to open or disconnects during a session, THEN THE Triage_Room_UI SHALL log a warning to the browser console, stop sending frames, and display a non-blocking visual indicator (e.g., a badge or icon) on the video feed area informing the user that defect detection is unavailable, without crashing or interrupting the chat functionality.
4. WHEN the Triage_Session ends, THE Triage_Room_UI SHALL close the WebSocket connection to the Vision_Service and stop frame capture.
5. THE Triage_Room_UI SHALL NOT attempt automatic WebSocket reconnection; the user must end and restart the session to re-establish the vision connection.

### Requirement 6: Bounding Box Overlay Rendering

**User Story:** As a user inspecting my product, I want to see defect bounding boxes drawn in real-time on top of my video feed, so that I can identify where defects have been detected.

#### Acceptance Criteria

1. WHEN the Triage_Room_UI receives a Defect_Detection_Payload from the Vision_Service, THE Triage_Room_UI SHALL draw bounding boxes on the canvas overlay using a red stroke color (#FF0000) with a line width of 2 CSS pixels at the coordinates specified in each detection.
2. WHEN drawing bounding boxes, THE Triage_Room_UI SHALL scale the coordinates from the original frame resolution (as reported in the Defect_Detection_Payload or derived from the captured frame dimensions) to the displayed canvas dimensions using the ratio `canvasWidth / frameWidth` and `canvasHeight / frameHeight` to ensure accurate positioning.
3. WHEN the Triage_Room_UI receives a Defect_Detection_Payload, THE Triage_Room_UI SHALL render the class label and confidence score (formatted to two decimal places, e.g., "scratch 0.87") as white text with a dark background positioned at the top-left corner of each corresponding bounding box.
4. WHEN a new Defect_Detection_Payload is received, THE Triage_Room_UI SHALL clear the entire canvas before drawing the new bounding boxes.
5. WHEN the Defect_Detection_Payload contains an empty detections array, THE Triage_Room_UI SHALL clear the canvas, removing all previously drawn bounding boxes.

### Requirement 7: Chat UI Integration

**User Story:** As a user in the triage session, I want to see and interact with the Gemini_Agent through a chat interface alongside my video feed, so that I receive real-time guidance during the inspection.

#### Acceptance Criteria

1. THE Triage_Room_UI SHALL display a chat panel positioned to the right of the video feed area that shows the conversation history between the user and the Gemini_Agent, with each message labeled by its sender role ("You" or "Agent").
2. WHEN the user clicks the "Start Session" button, THE Triage_Room_UI SHALL send a start request to `POST /api/triage/chat` with `{start: true, history: [], message: ""}` and display the Gemini_Agent opening message in the chat panel.
3. WHEN the user submits a text message via the chat input field and presses Enter or clicks a Send button, THE Triage_Room_UI SHALL send the full conversation history and the new message to `POST /api/triage/chat` and append both the user message and the Gemini_Agent response to the chat panel.
4. WHILE the Backend_Gateway is processing a chat request, THE Triage_Room_UI SHALL display a typing indicator (e.g., animated dots) in the chat panel and disable the chat input to prevent duplicate submissions.
5. IF a chat request fails, THEN THE Triage_Room_UI SHALL display an inline error message in the chat panel (e.g., "Failed to get response. Tap to retry.") and allow the user to retry the failed message by clicking the error message.
6. THE chat panel SHALL automatically scroll to the latest message when new messages are added.

### Requirement 8: Text-to-Speech for Agent Responses

**User Story:** As a user performing a hands-on inspection, I want the Gemini_Agent responses to be read aloud, so that I can follow instructions without looking at the chat panel.

#### Acceptance Criteria

1. WHEN the Triage_Room_UI receives a new Gemini_Agent response, THE Triage_Room_UI SHALL use the browser Web Speech API (`speechSynthesis`) to speak the response text aloud using the browser's default voice at a speech rate of 1.0.
2. WHEN a new speech utterance is triggered while a previous utterance is still playing, THE Triage_Room_UI SHALL cancel the previous utterance via `speechSynthesis.cancel()` before starting the new one.
3. IF the browser does not support the Web Speech API, THEN THE Triage_Room_UI SHALL display a one-time informational message in the chat panel indicating that voice output is unavailable and continue showing responses as text only.
4. THE Triage_Room_UI SHALL display a mute/unmute toggle button within the Triage Room UI that allows the user to disable or re-enable Text-to-Speech during the session; when muted, new responses SHALL NOT be spoken aloud.

### Requirement 9: Session Lifecycle Management

**User Story:** As a user, I want clear session start and end controls, so that I can initiate and conclude my triage inspection at will.

#### Acceptance Criteria

1. WHILE no Triage_Session is active, THE Triage_Room_UI SHALL display an enabled "Start Session" button and hide the "End Session" button.
2. WHEN the user clicks "Start Session", THE Triage_Room_UI SHALL initiate the Triage_Session by starting webcam capture, opening the Vision_Service WebSocket connection, and sending the start request to trigger the first Gemini_Agent message, and SHALL replace the "Start Session" button with an "End Session" button upon successful initiation.
3. IF any step of the session initiation fails (camera access denied, WebSocket connection failure, or chat start request failure), THEN THE Triage_Room_UI SHALL display an error message indicating which step failed, release any partially acquired resources (stop webcam if started, close WebSocket if opened), and return the UI to the pre-session state with the "Start Session" button enabled.
4. WHILE a Triage_Session is active, THE Triage_Room_UI SHALL display an enabled "End Session" button that, when clicked, stops frame capture, closes the WebSocket connection, stops the webcam stream, and clears the canvas overlay.
5. WHEN the user clicks "End Session", THE Triage_Room_UI SHALL retain the chat history on screen for user reference and restore the "Start Session" button, allowing the user to begin a new session.
6. WHEN the user clicks "End Session", THE Triage_Room_UI SHALL retain the chat history visible until the component unmounts or the user navigates away.

### Requirement 10: CORS and Cross-Origin Configuration

**User Story:** As a developer running the system locally with separate service ports, I want proper CORS configuration on all backend services, so that the frontend can communicate with both the Vision_Service and the Backend_Gateway without cross-origin errors.

#### Acceptance Criteria

1. THE Vision_Service SHALL allow WebSocket connections from `http://localhost:3000` by accepting the WebSocket upgrade request when the Origin header matches an allowed origin.
2. THE Backend_Gateway SHALL configure CORS to accept requests from `http://localhost:3000` on the `/api/triage/chat` endpoint, permitting the POST method and responding to preflight OPTIONS requests with appropriate CORS headers.
3. IF a request or WebSocket connection is received from an origin not in the allowed origins list, THEN THE Vision_Service or Backend_Gateway SHALL reject the connection by not including CORS headers in the response, causing the browser to block the request.
4. WHERE the system is deployed to a production environment, THE Vision_Service and Backend_Gateway SHALL support configuring allowed origins via the `ALLOWED_ORIGINS` environment variable, accepting a comma-separated list of origin URLs.
5. IF the `ALLOWED_ORIGINS` environment variable is not set, THEN THE Vision_Service and Backend_Gateway SHALL default to allowing only `http://localhost:3000`.
