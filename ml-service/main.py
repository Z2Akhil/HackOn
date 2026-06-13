"""
ReLoop — Return Prevention ML Microservice
Run: uvicorn main:app --port 8000 --reload
"""
import os
import sys
import json
import base64
import pickle
import logging
import asyncio
import time
from typing import Optional

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logger = logging.getLogger(__name__)

BASE = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE, "../models/prevention_model.pkl")
FEATURES_PATH = os.path.join(BASE, "../models/feature_names.json")


# --- CORS / Origin Validation ---

def get_allowed_origins() -> list[str]:
    """Read ALLOWED_ORIGINS env var (comma-separated) or default to localhost:3000."""
    env_val = os.environ.get("ALLOWED_ORIGINS", "").strip()
    if env_val:
        return [origin.strip() for origin in env_val.split(",") if origin.strip()]
    return ["http://localhost:3000"]


async def validate_ws_origin(websocket: WebSocket) -> bool:
    """Check WebSocket handshake Origin header against allowed origins.

    Returns True if origin is allowed, False otherwise.
    The /vision-stream endpoint should call this after accepting the connection
    (or before, to reject the upgrade entirely).
    """
    origin = websocket.headers.get("origin", "")
    allowed = get_allowed_origins()
    return origin in allowed


app = FastAPI(title="ReLoop Prevention Service", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model at startup
model = None
feature_names = []

# --- YOLOv8 Model Loading ---
YOLO_MODEL_PATH = os.environ.get("YOLO_MODEL_PATH", "yolov8n.pt")

def _load_yolo_model():
    """Load the YOLOv8 model at module level. Fails startup if invalid."""
    from ultralytics import YOLO

    model_path = YOLO_MODEL_PATH

    # If the path is not a known ultralytics default model name, check file existence
    _builtin_models = {
        "yolov8n.pt", "yolov8s.pt", "yolov8m.pt", "yolov8l.pt", "yolov8x.pt",
        "yolov8n-seg.pt", "yolov8s-seg.pt", "yolov8m-seg.pt",
        "yolov8n-cls.pt", "yolov8s-cls.pt", "yolov8m-cls.pt",
    }

    if model_path not in _builtin_models and not os.path.isfile(model_path):
        logger.error(
            f"YOLO model file not found: '{model_path}'. "
            "Set YOLO_MODEL_PATH to a valid model file path or a built-in model name."
        )
        sys.exit(1)

    try:
        yolo_model = YOLO(model_path)
        logger.info(f"YOLOv8 model loaded successfully: {model_path}")
        return yolo_model
    except Exception as e:
        logger.error(
            f"Failed to load YOLO model from '{model_path}': {e}"
        )
        sys.exit(1)

yolo_model = _load_yolo_model()

@app.on_event("startup")
def load_model():
    global model, feature_names
    if os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, "rb") as f:
            model = pickle.load(f)
        with open(FEATURES_PATH) as f:
            feature_names = json.load(f)
        print(f"Model loaded: {MODEL_PATH}")
    else:
        print("Warning: no model found — /predict will return mock scores")

CATEGORY_MAP = {"electronics": 0, "apparel": 1, "home_appliances": 2, "home": 3, "accessories": 4, "beauty": 5, "sports": 6}
PRICE_MAP = {"budget": 0, "mid": 1, "premium": 2}
REASON_MAP = {"defective": 0, "wrong_size": 1, "not_as_described": 2, "changed_mind": 3, "wrong_variant": 4}

DRIVER_LABELS = {
    "customer_category_return_rate": "your return history in this category",
    "product_return_rate": "high product return rate",
    "variant_size_mismatch_rate": "size/variant mismatch risk",
    "review_fit_sentiment": "negative fit reviews",
    "customer_total_returns": "total returns on account",
    "review_sentiment": "low review sentiment",
}

class PredictRequest(BaseModel):
    customer_id: str
    product_id: str
    category: str
    price_band: str = "mid"
    product_return_rate: float = 0.10
    variant_size_mismatch_rate: float = 0.0
    top_return_reason: str = "defective"
    review_fit_sentiment: float = 0.0
    customer_total_returns: int = 2
    customer_lifetime_orders: int = 15
    customer_category_return_rate: float = 0.10

class PredictResponse(BaseModel):
    risk: float
    top_driver: str
    recommended_intervention: str
    mock: bool = False

def intervention(risk: float) -> str:
    if risk > 0.6:
        return "show_banner_with_variant_suggestion"
    elif risk > 0.4:
        return "soft_nudge"
    return "none"

def top_driver_from_row(row: list, feature_names: list) -> str:
    # Heuristic: highest-weight features
    weights = {
        "customer_category_return_rate": row[5],
        "product_return_rate": row[0],
        "variant_size_mismatch_rate": row[1],
        "review_fit_sentiment": max(0, -row[2]),
    }
    best = max(weights, key=weights.get)
    return DRIVER_LABELS.get(best, best)

@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if model is None:
        # Mock fallback
        mock_risk = min(0.95, req.product_return_rate * 1.5 + req.customer_category_return_rate * 0.5)
        return PredictResponse(
            risk=round(mock_risk, 3),
            top_driver="high product return rate",
            recommended_intervention=intervention(mock_risk),
            mock=True,
        )

    row = [
        req.product_return_rate,
        req.variant_size_mismatch_rate,
        req.review_fit_sentiment,
        float(req.customer_total_returns),
        float(req.customer_lifetime_orders),
        req.customer_category_return_rate,
        float(REASON_MAP.get(req.top_return_reason, 0)),
        float(CATEGORY_MAP.get(req.category, 0)),
        float(PRICE_MAP.get(req.price_band, 1)),
    ]

    risk = float(model.predict_proba(np.array([row]))[0, 1])
    driver = top_driver_from_row(row, feature_names)

    return PredictResponse(
        risk=round(risk, 3),
        top_driver=driver,
        recommended_intervention=intervention(risk),
    )

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}


# --- Vision Stream WebSocket Endpoint ---

MAX_FRAME_SIZE = 5 * 1024 * 1024  # 5 MB encoded limit


@app.websocket("/vision-stream")
async def vision_stream(websocket: WebSocket):
    """WebSocket endpoint for real-time YOLO defect detection on video frames.

    Implements a frame-skip strategy: frames are received independently of processing.
    Only the most recently received frame is processed; older unprocessed frames are
    discarded to prevent queue buildup and memory pressure.
    """
    # Validate origin before accepting the WebSocket connection
    if not await validate_ws_origin(websocket):
        await websocket.close(code=1008, reason="Origin not allowed")
        return

    await websocket.accept()

    # Frame-skip strategy: use a lock-protected variable to hold the latest frame.
    # The receiver task always overwrites this with the newest frame data.
    # The processor task grabs whatever is latest when it's ready to process.
    latest_frame_lock = asyncio.Lock()
    latest_frame_data: dict = {"data": None}  # Mutable container for latest frame text
    frame_available = asyncio.Event()
    connection_closed = asyncio.Event()

    async def _receive_frames():
        """Continuously receive frames and keep only the latest one."""
        try:
            while not connection_closed.is_set():
                data = await websocket.receive_text()
                async with latest_frame_lock:
                    latest_frame_data["data"] = data
                frame_available.set()
        except WebSocketDisconnect:
            connection_closed.set()
            frame_available.set()  # Unblock processor if waiting
        except Exception:
            connection_closed.set()
            frame_available.set()

    async def _process_frames():
        """Process the most recently received frame, discarding older ones."""
        try:
            while not connection_closed.is_set():
                # Wait until a frame is available
                await frame_available.wait()

                if connection_closed.is_set():
                    break

                # Grab the latest frame and clear the slot
                async with latest_frame_lock:
                    data = latest_frame_data["data"]
                    latest_frame_data["data"] = None
                    frame_available.clear()

                if data is None:
                    continue

                # Validate frame size (≤ 5MB encoded)
                if len(data) > MAX_FRAME_SIZE:
                    await websocket.send_json({"error": "Frame exceeds 5MB limit"})
                    continue

                # Validate Base64 encoding
                try:
                    frame_bytes = base64.b64decode(data, validate=True)
                except Exception:
                    await websocket.send_json({"error": "Invalid Base64 encoding"})
                    continue

                # Decode JPEG using OpenCV
                np_arr = np.frombuffer(frame_bytes, dtype=np.uint8)
                frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

                if frame is None:
                    await websocket.send_json({"error": "Not a valid JPEG image"})
                    continue

                frame_height, frame_width = frame.shape[:2]

                # Run YOLOv8 inference with performance timing
                start_time = time.time()
                results = yolo_model(frame, verbose=False)
                processing_duration_ms = (time.time() - start_time) * 1000

                if processing_duration_ms > 500:
                    logger.warning(
                        f"Frame processing exceeded 500ms: {processing_duration_ms:.1f}ms"
                    )

                # Build detections array from YOLO results
                detections = []
                for result in results:
                    boxes = result.boxes
                    if boxes is not None:
                        for i in range(len(boxes)):
                            bbox = boxes.xyxy[i].tolist()
                            # Clamp coordinates to frame dimensions and convert to non-negative integers
                            x1 = max(0, min(int(bbox[0]), frame_width))
                            y1 = max(0, min(int(bbox[1]), frame_height))
                            x2 = max(0, min(int(bbox[2]), frame_width))
                            y2 = max(0, min(int(bbox[3]), frame_height))

                            confidence = float(boxes.conf[i])
                            class_id = int(boxes.cls[i])
                            label = result.names.get(class_id, str(class_id))
                            # Truncate label to max 64 characters
                            label = label[:64]

                            detections.append({
                                "bbox": [x1, y1, x2, y2],
                                "label": label,
                                "confidence": round(confidence, 4),
                            })

                # Return DetectionPayload
                payload = {
                    "detections": detections,
                    "frame_width": frame_width,
                    "frame_height": frame_height,
                }
                await websocket.send_json(payload)

        except WebSocketDisconnect:
            connection_closed.set()
        except Exception as e:
            if not connection_closed.is_set():
                logger.error(f"Unexpected error in vision stream processing: {e}")
                connection_closed.set()

    # Run receiver and processor as concurrent tasks
    receiver_task = asyncio.create_task(_receive_frames())
    processor_task = asyncio.create_task(_process_frames())

    try:
        # Wait for either task to complete (usually receiver on disconnect)
        done, pending = await asyncio.wait(
            [receiver_task, processor_task],
            return_when=asyncio.FIRST_COMPLETED,
        )
        # Signal the other task to stop
        connection_closed.set()
        frame_available.set()
        # Cancel pending tasks and wait for them to finish
        for task in pending:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
    except Exception as e:
        logger.error(f"Unexpected error in vision stream: {e}")
        connection_closed.set()
        frame_available.set()
        receiver_task.cancel()
        processor_task.cancel()
        try:
            await receiver_task
        except (asyncio.CancelledError, Exception):
            pass
        try:
            await processor_task
        except (asyncio.CancelledError, Exception):
            pass
        try:
            await websocket.close()
        except Exception:
            pass
