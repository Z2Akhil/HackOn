"""
Generates all synthetic data for ReLoop demo.
Run once before training: python data/generate_synthetic.py
"""
import json
import csv
import random
import os

random.seed(42)

BASE = os.path.dirname(os.path.abspath(__file__))


# ── Products ──────────────────────────────────────────────────────────────────

PRODUCTS = [
    {"id": "p001", "name": "Sony WH-1000XM5 Headphones", "category": "electronics", "mrp": 29990, "avg_return_rate": 0.08, "top_return_reason": "defective", "image": "/images/headphones.jpg"},
    {"id": "p002", "name": "Nike Air Max 270 Sneakers (M)", "category": "apparel", "mrp": 12995, "avg_return_rate": 0.22, "top_return_reason": "wrong_size", "image": "/images/sneakers.jpg"},
    {"id": "p003", "name": "Bajaj Mixer Grinder 750W", "category": "home_appliances", "mrp": 3499, "avg_return_rate": 0.11, "top_return_reason": "defective", "image": "/images/blender.jpg"},
    {"id": "p004", "name": "Levis 511 Slim Fit Jeans", "category": "apparel", "mrp": 4999, "avg_return_rate": 0.28, "top_return_reason": "wrong_size", "image": "/images/jeans.jpg"},
    {"id": "p005", "name": "OnePlus Nord CE 4 (8GB/128GB)", "category": "electronics", "mrp": 24999, "avg_return_rate": 0.06, "top_return_reason": "not_as_described", "image": "/images/phone.jpg"},
    {"id": "p006", "name": "Prestige Induction Cooktop", "category": "home_appliances", "mrp": 2199, "avg_return_rate": 0.09, "top_return_reason": "defective", "image": "/images/cooktop.jpg"},
    {"id": "p007", "name": "Wildcraft Backpack 45L", "category": "apparel", "mrp": 3299, "avg_return_rate": 0.07, "top_return_reason": "not_as_described", "image": "/images/backpack.jpg"},
    {"id": "p008", "name": "boAt Airdopes 141 TWS Earbuds", "category": "electronics", "mrp": 1299, "avg_return_rate": 0.13, "top_return_reason": "defective", "image": "/images/earbuds.jpg"},
    {"id": "p009", "name": "Bombay Dyeing Double Bedsheet Set", "category": "home", "mrp": 1499, "avg_return_rate": 0.15, "top_return_reason": "not_as_described", "image": "/images/bedsheet.jpg"},
    {"id": "p010", "name": "Pigeon Non-Stick Tawa 30cm", "category": "home_appliances", "mrp": 899, "avg_return_rate": 0.10, "top_return_reason": "defective", "image": "/images/tawa.jpg"},
    {"id": "p011", "name": "Fastrack Analog Watch (Men)", "category": "accessories", "mrp": 2995, "avg_return_rate": 0.09, "top_return_reason": "not_as_described", "image": "/images/watch.jpg"},
    {"id": "p012", "name": "Canon PIXMA G3010 Printer", "category": "electronics", "mrp": 13995, "avg_return_rate": 0.10, "top_return_reason": "defective", "image": "/images/printer.jpg"},
    {"id": "p013", "name": "Puma Men's Track Jacket L", "category": "apparel", "mrp": 2799, "avg_return_rate": 0.19, "top_return_reason": "wrong_size", "image": "/images/jacket.jpg"},
    {"id": "p014", "name": "Mi 80cm 4K UHD Smart TV", "category": "electronics", "mrp": 54999, "avg_return_rate": 0.05, "top_return_reason": "defective", "image": "/images/tv.jpg"},
    {"id": "p015", "name": "Himalaya Face Wash Combo Pack", "category": "beauty", "mrp": 349, "avg_return_rate": 0.04, "top_return_reason": "not_as_described", "image": "/images/facewash.jpg"},
    {"id": "p016", "name": "Solimo Yoga Mat with Carry Strap", "category": "sports", "mrp": 599, "avg_return_rate": 0.06, "top_return_reason": "not_as_described", "image": "/images/yogamat.jpg"},
    {"id": "p017", "name": "Havells 1.5T Inverter Split AC", "category": "home_appliances", "mrp": 42990, "avg_return_rate": 0.04, "top_return_reason": "defective", "image": "/images/ac.jpg"},
    {"id": "p018", "name": "Casio Scientific Calculator FX-991EX", "category": "electronics", "mrp": 1295, "avg_return_rate": 0.05, "top_return_reason": "defective", "image": "/images/calculator.jpg"},
    {"id": "p019", "name": "Duroflex Orthopaedic 6-Inch Mattress", "category": "home", "mrp": 15999, "avg_return_rate": 0.08, "top_return_reason": "not_as_described", "image": "/images/mattress.jpg"},
    {"id": "p020", "name": "Skechers Go Walk 7 (Women W7)", "category": "apparel", "mrp": 5495, "avg_return_rate": 0.24, "top_return_reason": "wrong_size", "image": "/images/walkshoes.jpg"},
]

with open(os.path.join(BASE, "products.json"), "w") as f:
    json.dump(PRODUCTS, f, indent=2)
print(f"products.json: {len(PRODUCTS)} items")


# ── Resale reference (EV optimizer seed) ─────────────────────────────────────

GRADES = ["A", "A-", "B+", "B", "C"]
CATEGORIES = ["electronics", "apparel", "home_appliances", "home", "accessories", "beauty", "sports"]

rows = []
configs = {
    "electronics":     {"A": (0.72, 0.85, 0.08), "A-": (0.62, 0.75, 0.10), "B+": (0.50, 0.60, 0.14), "B": (0.38, 0.45, 0.20), "C": (0.20, 0.25, 0.30)},
    "apparel":         {"A": (0.55, 0.80, 0.05), "A-": (0.45, 0.70, 0.07), "B+": (0.35, 0.55, 0.10), "B": (0.22, 0.40, 0.15), "C": (0.10, 0.20, 0.20)},
    "home_appliances": {"A": (0.60, 0.78, 0.10), "A-": (0.50, 0.68, 0.13), "B+": (0.40, 0.55, 0.18), "B": (0.28, 0.40, 0.25), "C": (0.15, 0.20, 0.35)},
    "home":            {"A": (0.52, 0.75, 0.06), "A-": (0.42, 0.65, 0.08), "B+": (0.32, 0.50, 0.12), "B": (0.20, 0.35, 0.18), "C": (0.08, 0.18, 0.25)},
    "accessories":     {"A": (0.58, 0.80, 0.06), "A-": (0.48, 0.70, 0.08), "B+": (0.38, 0.55, 0.12), "B": (0.25, 0.40, 0.16), "C": (0.12, 0.22, 0.22)},
    "beauty":          {"A": (0.30, 0.60, 0.02), "A-": (0.22, 0.50, 0.03), "B+": (0.14, 0.38, 0.04), "B": (0.08, 0.25, 0.06), "C": (0.03, 0.10, 0.08)},
    "sports":          {"A": (0.50, 0.75, 0.05), "A-": (0.40, 0.65, 0.07), "B+": (0.30, 0.52, 0.10), "B": (0.18, 0.38, 0.15), "C": (0.08, 0.20, 0.20)},
}

for cat in CATEGORIES:
    for grade in GRADES:
        resale_pct, sell_prob, refurb_cost = configs[cat][grade]
        rows.append({
            "category": cat,
            "grade": grade,
            "expected_resale_pct_of_mrp": resale_pct,
            "sell_through_prob": sell_prob,
            "refurb_cost_pct": refurb_cost,
        })

with open(os.path.join(BASE, "resale_reference.csv"), "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=rows[0].keys())
    w.writeheader()
    w.writerows(rows)
print(f"resale_reference.csv: {len(rows)} rows")


# ── Buyers ────────────────────────────────────────────────────────────────────

BUYERS = [
    {"id": "b001", "name": "Ankit Sharma", "price_band": "budget", "category_affinity": ["electronics", "home_appliances"], "eco_preference": 0.8, "grade_tolerance": ["A", "A-", "B+"]},
    {"id": "b002", "name": "Priya Nair", "price_band": "mid", "category_affinity": ["apparel", "accessories"], "eco_preference": 0.9, "grade_tolerance": ["A", "A-"]},
    {"id": "b003", "name": "Rohan Mehta", "price_band": "budget", "category_affinity": ["electronics", "sports"], "eco_preference": 0.5, "grade_tolerance": ["A", "A-", "B+", "B"]},
    {"id": "b004", "name": "Divya Krishnan", "price_band": "mid", "category_affinity": ["home", "home_appliances"], "eco_preference": 0.85, "grade_tolerance": ["A", "A-"]},
    {"id": "b005", "name": "Saurabh Joshi", "price_band": "budget", "category_affinity": ["electronics", "accessories"], "eco_preference": 0.4, "grade_tolerance": ["A-", "B+", "B"]},
    {"id": "b006", "name": "Meera Iyer", "price_band": "premium", "category_affinity": ["apparel", "beauty"], "eco_preference": 0.95, "grade_tolerance": ["A"]},
    {"id": "b007", "name": "Karan Patel", "price_band": "budget", "category_affinity": ["home_appliances", "home"], "eco_preference": 0.6, "grade_tolerance": ["A-", "B+", "B"]},
    {"id": "b008", "name": "Sneha Rao", "price_band": "mid", "category_affinity": ["electronics", "sports"], "eco_preference": 0.75, "grade_tolerance": ["A", "A-", "B+"]},
    {"id": "b009", "name": "Vikram Desai", "price_band": "premium", "category_affinity": ["electronics", "accessories"], "eco_preference": 0.7, "grade_tolerance": ["A", "A-"]},
    {"id": "b010", "name": "Anjali Singh", "price_band": "budget", "category_affinity": ["apparel", "home"], "eco_preference": 0.85, "grade_tolerance": ["A", "A-", "B+", "B"]},
]

with open(os.path.join(BASE, "buyers.json"), "w") as f:
    json.dump(BUYERS, f, indent=2)
print(f"buyers.json: {len(BUYERS)} buyers")


# ── Return events (demo items) ────────────────────────────────────────────────

RETURN_REASONS = ["defective", "wrong_size", "not_as_described", "changed_mind", "wrong_variant"]

RETURN_EVENTS = [
    {"id": "r001", "product_id": "p003", "product_name": "Bajaj Mixer Grinder 750W", "category": "home_appliances", "mrp": 3499, "return_reason": "defective", "customer_id": "c042", "photos": ["/images/blender.jpg"], "mock_grade": {"grade": "A-", "functional_risk": "low", "defects": ["minor scuff on lid", "light scratches on base"], "packaging_status": "missing_box", "accessories_complete": True, "confidence": 0.88}},
    {"id": "r002", "product_id": "p001", "product_name": "Sony WH-1000XM5 Headphones", "category": "electronics", "mrp": 29990, "return_reason": "changed_mind", "customer_id": "c017", "photos": ["/images/headphones.jpg"], "mock_grade": {"grade": "A", "functional_risk": "none", "defects": [], "packaging_status": "original_box", "accessories_complete": True, "confidence": 0.95}},
    {"id": "r003", "product_id": "p004", "product_name": "Levis 511 Slim Fit Jeans", "category": "apparel", "mrp": 4999, "return_reason": "wrong_size", "customer_id": "c091", "photos": ["/images/jeans.jpg"], "mock_grade": {"grade": "A", "functional_risk": "none", "defects": [], "packaging_status": "original_box", "accessories_complete": True, "confidence": 0.97}},
    {"id": "r004", "product_id": "p009", "product_name": "Bombay Dyeing Double Bedsheet Set", "category": "home", "mrp": 1499, "return_reason": "not_as_described", "customer_id": "c055", "photos": ["/images/bedsheet.jpg"], "mock_grade": {"grade": "A", "functional_risk": "none", "defects": ["colour slightly different from listing"], "packaging_status": "original_box", "accessories_complete": True, "confidence": 0.91}},
    {"id": "r005", "product_id": "p008", "product_name": "boAt Airdopes 141 TWS Earbuds", "category": "electronics", "mrp": 1299, "return_reason": "defective", "customer_id": "c033", "photos": ["/images/earbuds.jpg"], "mock_grade": {"grade": "B+", "functional_risk": "medium", "defects": ["left earbud intermittent audio", "case hinge loose"], "packaging_status": "missing_box", "accessories_complete": False, "confidence": 0.82}},
    {"id": "r006", "product_id": "p002", "product_name": "Nike Air Max 270 Sneakers", "category": "apparel", "mrp": 12995, "return_reason": "wrong_size", "customer_id": "c078", "photos": ["/images/sneakers.jpg"], "mock_grade": {"grade": "A", "functional_risk": "none", "defects": [], "packaging_status": "original_box", "accessories_complete": True, "confidence": 0.96}},
    {"id": "r007", "product_id": "p011", "product_name": "Fastrack Analog Watch", "category": "accessories", "mrp": 2995, "return_reason": "not_as_described", "customer_id": "c014", "photos": ["/images/watch.jpg"], "mock_grade": {"grade": "A-", "functional_risk": "none", "defects": ["strap slightly different shade"], "packaging_status": "original_box", "accessories_complete": True, "confidence": 0.89}},
    {"id": "r008", "product_id": "p016", "product_name": "Solimo Yoga Mat", "category": "sports", "mrp": 599, "return_reason": "not_as_described", "customer_id": "c062", "photos": ["/images/yogamat.jpg"], "mock_grade": {"grade": "A", "functional_risk": "none", "defects": [], "packaging_status": "original_packaging", "accessories_complete": True, "confidence": 0.93}},
]

# Pad to 30 events with random variations
EXTRA_REASONS = ["defective", "wrong_size", "changed_mind", "not_as_described"]
for i in range(9, 31):
    base = random.choice(RETURN_EVENTS[:8])
    RETURN_EVENTS.append({
        "id": f"r{i:03d}",
        "product_id": base["product_id"],
        "product_name": base["product_name"],
        "category": base["category"],
        "mrp": base["mrp"],
        "return_reason": random.choice(EXTRA_REASONS),
        "customer_id": f"c{random.randint(10, 200):03d}",
        "photos": base["photos"],
        "mock_grade": base["mock_grade"],
    })

with open(os.path.join(BASE, "return_events.json"), "w") as f:
    json.dump(RETURN_EVENTS, f, indent=2)
print(f"return_events.json: {len(RETURN_EVENTS)} events")


# ── Prevention training data ──────────────────────────────────────────────────

CATEGORY_RETURN_RATES = {
    "electronics": 0.08, "apparel": 0.24, "home_appliances": 0.10,
    "home": 0.10, "accessories": 0.09, "beauty": 0.04, "sports": 0.06,
}

def make_row(i):
    cat = random.choice(list(CATEGORY_RETURN_RATES.keys()))
    product = random.choice([p for p in PRODUCTS if p["category"] == cat])
    customer_total_returns = random.randint(0, 30)
    customer_lifetime_orders = customer_total_returns + random.randint(1, 100)
    customer_cat_return_rate = min(1.0, customer_total_returns / max(customer_lifetime_orders, 1) * random.uniform(0.8, 1.8))

    size_mismatch = random.random() < (0.6 if cat == "apparel" else 0.1)
    review_fit_sentiment = random.uniform(-0.8, 0.2) if cat == "apparel" else random.uniform(-0.3, 0.5)
    price_band = "budget" if product["mrp"] < 2000 else ("mid" if product["mrp"] < 15000 else "premium")
    top_reason_enc = {"defective": 0, "wrong_size": 1, "not_as_described": 2, "changed_mind": 3, "wrong_variant": 4}

    # Realistic correlations → will_return label
    risk = (
        product["avg_return_rate"] * 0.3
        + customer_cat_return_rate * 0.3
        + (0.3 if size_mismatch and cat == "apparel" else 0)
        + max(0, -review_fit_sentiment) * 0.1
    )
    will_return = int(random.random() < risk)

    return {
        "product_id": product["id"],
        "category": cat,
        "price_band": price_band,
        "product_return_rate": product["avg_return_rate"],
        "variant_size_mismatch_rate": round(float(size_mismatch), 2),
        "top_return_reason": product["top_return_reason"],
        "top_return_reason_enc": top_reason_enc[product["top_return_reason"]],
        "review_fit_sentiment": round(review_fit_sentiment, 4),
        "customer_total_returns": customer_total_returns,
        "customer_lifetime_orders": customer_lifetime_orders,
        "customer_category_return_rate": round(customer_cat_return_rate, 4),
        "will_return": will_return,
    }

train_rows = [make_row(i) for i in range(2000)]
with open(os.path.join(BASE, "returns_train.csv"), "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=train_rows[0].keys())
    w.writeheader()
    w.writerows(train_rows)

returns = sum(r["will_return"] for r in train_rows)
print(f"returns_train.csv: 2000 rows, {returns} positives ({100*returns//2000}%)")
print("\nAll synthetic data generated.")
