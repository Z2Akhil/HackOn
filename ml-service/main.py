"""
ReLoop — Return Prevention ML Microservice
Run: uvicorn main:app --port 8000 --reload
"""
import os
import json
import pickle
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE, "../models/prevention_model.pkl")
FEATURES_PATH = os.path.join(BASE, "../models/feature_names.json")

app = FastAPI(title="ReLoop Prevention Service", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model at startup
model = None
feature_names = []

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

    import numpy as np
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
