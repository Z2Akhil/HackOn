"""
Train LightGBM return-prevention model.
Run from repo root: python models/train_prevention.py
Outputs: models/prevention_model.pkl + models/feature_names.json
"""
import os
import csv
import json
import pickle

BASE = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE, "../data/returns_train.csv")
MODEL_PATH = os.path.join(BASE, "prevention_model.pkl")
FEATURES_PATH = os.path.join(BASE, "feature_names.json")

NUMERIC_FEATURES = [
    "product_return_rate",
    "variant_size_mismatch_rate",
    "review_fit_sentiment",
    "customer_total_returns",
    "customer_lifetime_orders",
    "customer_category_return_rate",
    "top_return_reason_enc",
]

CATEGORY_MAP = {"electronics": 0, "apparel": 1, "home_appliances": 2, "home": 3, "accessories": 4, "beauty": 5, "sports": 6}
PRICE_MAP = {"budget": 0, "mid": 1, "premium": 2}

FEATURE_NAMES = NUMERIC_FEATURES + ["category_enc", "price_band_enc"]

def load_data():
    X, y = [], []
    with open(DATA_PATH) as f:
        for row in csv.DictReader(f):
            feats = [float(row[f]) for f in NUMERIC_FEATURES]
            feats.append(float(CATEGORY_MAP.get(row["category"], 0)))
            feats.append(float(PRICE_MAP.get(row["price_band"], 1)))
            X.append(feats)
            y.append(int(row["will_return"]))
    return X, y

def main():
    try:
        import lightgbm as lgb
        from sklearn.calibration import CalibratedClassifierCV
        from sklearn.model_selection import train_test_split
        import numpy as np

        X, y = load_data()
        X = np.array(X)
        y = np.array(y)

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        lgb_model = lgb.LGBMClassifier(
            n_estimators=200, max_depth=6, learning_rate=0.05,
            num_leaves=31, min_child_samples=20, random_state=42, verbose=-1,
        )
        calibrated = CalibratedClassifierCV(lgb_model, method="isotonic", cv=3)
        calibrated.fit(X_train, y_train)

        probs = calibrated.predict_proba(X_test)[:, 1]
        from sklearn.metrics import roc_auc_score, brier_score_loss
        auc = roc_auc_score(y_test, probs)
        brier = brier_score_loss(y_test, probs)
        print(f"AUC: {auc:.3f}  Brier: {brier:.4f}")

        with open(MODEL_PATH, "wb") as f:
            pickle.dump(calibrated, f)
        with open(FEATURES_PATH, "w") as f:
            json.dump(FEATURE_NAMES, f)
        print(f"Model saved: {MODEL_PATH}")

    except ImportError:
        # Fallback: save a simple logistic regression so the service still works
        print("LightGBM not found — training logistic regression fallback")
        from sklearn.linear_model import LogisticRegression
        from sklearn.calibration import CalibratedClassifierCV
        from sklearn.model_selection import train_test_split
        import numpy as np

        X, y = load_data()
        X = np.array(X)
        y = np.array(y)

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        model = LogisticRegression(max_iter=500, random_state=42)
        calibrated = CalibratedClassifierCV(model, method="isotonic", cv=3)
        calibrated.fit(X_train, y_train)

        probs = calibrated.predict_proba(X_test)[:, 1]
        from sklearn.metrics import roc_auc_score
        print(f"AUC: {roc_auc_score(y_test, probs):.3f}")

        with open(MODEL_PATH, "wb") as f:
            pickle.dump(calibrated, f)
        with open(FEATURES_PATH, "w") as f:
            json.dump(FEATURE_NAMES, f)
        print(f"Fallback model saved: {MODEL_PATH}")

if __name__ == "__main__":
    main()
