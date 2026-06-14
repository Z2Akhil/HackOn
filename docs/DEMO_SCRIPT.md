# ReLoop — Demo Script & Technical Deep-Dive
### HackOn with Amazon 6.0 | 13–14 June 2026

---

## 0. OPENING — THE PROBLEM (60 seconds)

**Say this:**

> "Every year, millions of products bought online are returned, abandoned, or thrown away — even though they still work perfectly.
> Returns cost Amazon and sellers billions in reverse logistics, restocking, and write-offs.
> Customers who want refurbished products can't trust them — no standard grading, no proof of condition.
> And most returned items end up in landfill.
>
> The question is: **what if every returned product could automatically find its next best owner?**
>
> That's ReLoop. Not just a UI — a full AI pipeline with three real models making real decisions."

**Problem dimensions to hit:**
- 💸 Financial: reverse logistics cost 2–3× the original shipping, restocking = labor + warehouse space
- 🌍 Environmental: returned electronics alone generate millions of tonnes of e-waste annually
- 🤝 Trust gap: buyers don't trust "refurbished" because grading is inconsistent and opaque
- 📦 Seller pain: 30% of online returns are perfectly functional items returned for wrong-size or changed-mind

---

## 1. FEATURE 1 — PREDICTIVE RETURN PREVENTION

### What
Intercept a return **before it happens** — at the product page, before the customer even adds to cart.

### Demo Step
> Open the product page for **Levis 511 Slim Fit Jeans** (apparel, high return rate).
> Show the orange/red prevention banner appearing automatically.

### How It Works — Full Architecture

```
[Product Page Load]
       │
       ▼
[PreventionBanner.tsx] ──POST /api/prevention/score──▶ [Next.js route handler]
                                                               │
                                              tries real ML service first (3s timeout)
                                                               │
                                    ┌──────────────────────────┤
                                    ▼                          ▼
                        [FastAPI /predict]           [Deterministic mock fallback]
                        Python :8000                 mock_risk = product.avg_return_rate
                               │                     × 2.2 + variant_mismatch × 0.3
                               ▼
                    [LightGBM Classifier]
                    + Isotonic Calibration
                               │
                               ▼
                    { risk: 0–1, top_driver: str }
                               │
                               ▼
                    recommended_intervention:
                    risk > 0.6 → "show_banner_with_variant_suggestion"
                    risk 0.4–0.6 → "soft_nudge"
                    risk < 0.4 → nothing (no banner)
```

### The ML Model — LightGBM

**Why LightGBM?**
- Gradient boosted trees handle tabular data better than neural nets at small-to-mid data scale
- Natively supports categorical features
- Fast inference (<5ms) — needed for page load
- Probability calibration via isotonic regression gives real probabilities (not just ranks)

**Training Data:** 2,000 synthetic rows in `data/returns_train.csv`  
Correlations injected realistically:
- Apparel + "runs small" reason + high past return history → high risk
- Electronics defective + new customer → medium risk
- Unchanged_mind + premium price → medium risk

**Features used (9 total):**

| Feature | What it captures |
|---------|-----------------|
| `product_return_rate` | Historical return % for this SKU |
| `category` | Electronics vs apparel vs home etc. (encoded) |
| `price_band` | budget / mid / premium (encoded) |
| `variant_size_mismatch_rate` | How often this variant gets returned for size |
| `top_return_reason` | Most common reason for this product (encoded) |
| `review_fit_sentiment` | Sentiment score from "fit" mentions in reviews (−1 to +1) |
| `customer_total_returns` | Lifetime return count for this customer |
| `customer_category_return_rate` | Customer's return rate in THIS category |
| `customer_lifetime_orders` | Total orders (to weight the return rate) |

**Model pipeline:**
```python
lgb_model = LGBMClassifier(
    n_estimators=200, max_depth=6, learning_rate=0.05, num_leaves=31
)
calibrated = CalibratedClassifierCV(lgb_model, method="isotonic", cv=3)
# → output: risk probability 0–1 + top_driver string
```

**Output JSON:**
```json
{
  "risk": 0.73,
  "top_driver": "high product return rate",
  "recommended_intervention": "show_banner_with_variant_suggestion"
}
```

**Why isotonic calibration?**  
Raw LightGBM probabilities are often over-confident. Isotonic regression (cross-validated) maps raw scores to true probabilities — so "0.73" actually means 73% of similar customers returned the item.

### UI Banner Logic
```
risk > 0.6 → Red banner + specific insight ("84% of returns in apparel cite size mismatch")
risk 0.4–0.6 → Amber soft nudge
risk < 0.4 → No banner (don't cry wolf)
```

**What to say during demo:**
> "The model runs on page load. It combines this product's historical return rate, this customer's behaviour in the apparel category, and the variant mismatch signal. It doesn't just say 'high risk' — it surfaces the top driver so the banner gives the customer actionable advice. Not a generic warning — a specific insight backed by data."

---

## 2. FEATURE 2 — AI VISION GRADING + DISPOSITION DECISION

This is the core loop. Two AI models working together.

### 2a. AI Vision Grading

### Demo Step
> In the **Return Flow**, take or upload 2–3 photos of the Bajaj Mixer Grinder.
> Show the grade result: **A-**, functional_risk: low, defects: ["minor scuff on base"].

### How It Works

```
[User uploads photos in ReturnModal]
        │
        ▼
[Canvas API — compress each image]
maxWidth=600px, quality=0.65 JPEG → base64 string
(keeps payload under Gemini free-tier limits)
        │
        ▼
[POST /api/grade  multipart/form-data]
        │
        ▼
ALL frames sent in ONE API call (holistic analysis)
        │
        ├──▶ [Gemini 2.5 Flash] — primary
        │    model: "gemini-2.5-flash"
        │    input: gradePrompt(N) + all N images inline
        │    
        └──▶ [Groq Llama 4 Scout] — fallback if Gemini fails
             same prompt, same images via base64 URL
        
        │   (if both fail)
        └──▶ [Deterministic mock] — demo never breaks
             returns: { grade:"A-", functional_risk:"low", ... }
```

**Why send ALL images in one call?**  
Per-image grading then picking the worst grade misses defects that are only visible in combination (e.g., photo 1 shows the lid is scratched, photo 2 shows the base is fine — the model needs to see both to know the lid scratch is real). One holistic call = better accuracy, fewer tokens.

**Grading Prompt rules (enforced in system prompt):**
- "A defect visible in ANY photo must appear in defects[]"
- "Assign the WORST grade seen across all angles — never average"
- "Set confidence lower if photos are blurry or contradictory"

**Grade Scale:**
| Grade | Meaning |
|-------|---------|
| A | Like new, zero visible wear |
| A- | Minor cosmetic only (light scuff, small scratch) |
| B+ | Moderate wear, fully functional |
| B | Heavy wear or minor functional issue |
| C | Poor condition or significant functional problem |

**Output JSON (strict schema):**
```json
{
  "grade": "A-",
  "functional_risk": "low",
  "defects": ["minor scuff on base"],
  "packaging_status": "missing_box",
  "accessories_complete": true,
  "confidence": 0.88
}
```

**Why Gemini 2.5 Flash?**
- Multimodal natively — no third-party OCR or preprocessing
- Fast (< 3s for 3 images), cheap per token
- Supports inline base64 images directly in the content array
- Groq Scout as fallback = zero single point of failure

---

### 2b. Disposition Decision — Multi-Objective Optimizer

### Demo Step
> After grade result, show the **Disposition Card** with decision: **RESELL**, EV table, score breakdown, circularity score.

**What to say:**
> "This is NOT an LLM making the decision. This is deterministic TypeScript running a 3-objective optimization. Gemini only writes the explanation sentence at the bottom. The actual RESELL decision and all the numbers are computed locally."

### Architecture
```
[Grade JSON] + [Product MRP + Category] + [Return Reason]
        │
        ▼
[computeEV() — lib/ev-optimizer.ts]
        │
        ├─── Step 1: Look up resale_reference.csv
        │    category × grade → { expected_resale_pct, sell_through_prob, refurb_cost_pct }
        │
        ├─── Step 2: Compute raw Expected Value per channel (₹)
        │
        ├─── Step 3: Normalize EVs + apply 3-weight scoring
        │
        ├─── Step 4: decision = argmax(final_score)
        │
        └─── Step 5: Gemini writes reasoning_text (narrator, not decider)
```

### Step 2: Raw EV Formulas

**Resell:**
```
EV_resell = sell_through_prob × (mrp × resale_pct) 
            − (mrp × 0.03)   ← relisting cost
            − (mrp × 0.05)   ← logistics cost
```

**Refurbish:**
```
repair_ok_prob:
  functional_risk = none   → 0.95
  functional_risk = low    → 0.80
  functional_risk = medium → 0.60
  functional_risk = high   → 0.30

refurb_grade = one step below current grade
refurb_resale = mrp × resale_pct[refurb_grade]

EV_refurbish = repair_ok_prob × refurb_resale
               − (mrp × refurb_cost_pct)
               − (mrp × 0.05)   ← logistics
```

**Donate:**
```
EV_donate = (mrp × 0.08)   ← CSR / brand value
           + (mrp × 0.04)   ← tax benefit
           − (mrp × 0.05)   ← logistics
```

**Recycle:**
```
EV_recycle = (mrp × 0.10)   ← salvage material value
            − (mrp × 0.02)   ← processing cost
(no logistics — bulk collected)
```

**Exchange** (only if return_reason = "wrong_variant" or "wrong_size"):
```
EV_exchange = resale_price × 0.9 − logistics
(else: −∞, channel excluded from competition)
```

### Step 3: Multi-Objective Scoring

```
economic_score     = clamp(EV_channel / (mrp × 0.85), 0, 1)
sustainability     = fixed per channel (table below)
trust              = fixed per channel (table below)

Final_score = 0.5 × economic + 0.3 × sustainability + 0.2 × trust
```

| Channel | Sustainability | Trust | Why |
|---------|---------------|-------|-----|
| donate | 1.00 | 0.60 | Most green, lowest trust (charity recipient unknown) |
| recycle | 0.85 | 0.30 | Very green, no next-owner |
| refurbish | 0.75 | 0.70 | Good green, repaired = some trust |
| resell | 0.70 | 0.90 | Less green, highest trust (graded condition passport) |
| exchange | 0.65 | 0.80 | Variant swap, no real recycling |

**Decision = channel with highest Final_score.**

### Real Example — Bajaj Mixer Grinder (MRP ₹3,499, Grade A-)

From `resale_reference.csv` for `home_appliances, A-`:
```
resale_pct = 0.50
sell_through_prob = 0.68
refurb_cost_pct = 0.13
```

```
EV_resell    = 0.68 × (3499 × 0.50) − 3499×0.03 − 3499×0.05
             = 0.68 × 1749.50 − 104.97 − 174.95
             = 1189.66 − 279.92 = ≈ 910 ₹

EV_refurbish = 0.80 × (3499 × 0.40) − 3499×0.13 − 3499×0.05
             = 0.80 × 1399.60 − 454.87 − 174.95
             = 1119.68 − 629.82 = ≈ 490 ₹

EV_donate    = 3499×0.08 + 3499×0.04 − 3499×0.05 = 279.92 − 174.95 = ≈ 245 ₹
EV_recycle   = 3499×0.10 − 3499×0.02 = 349.90 − 69.98 = ≈ 280 ₹

ev_max = 3499 × 0.85 = 2974.15

economic scores:
  resell:    910/2974 = 0.306
  refurbish: 490/2974 = 0.165
  donate:    245/2974 = 0.082
  recycle:   280/2974 = 0.094

final scores:
  resell:    0.5×0.306 + 0.3×0.70 + 0.2×0.90 = 0.153 + 0.210 + 0.180 = 0.543 ✅ WINNER
  refurbish: 0.5×0.165 + 0.3×0.75 + 0.2×0.70 = 0.082 + 0.225 + 0.140 = 0.447
  donate:    0.5×0.082 + 0.3×1.00 + 0.2×0.60 = 0.041 + 0.300 + 0.120 = 0.461
  recycle:   0.5×0.094 + 0.3×0.85 + 0.2×0.30 = 0.047 + 0.255 + 0.060 = 0.362
```

**Decision: RESELL at ₹910 estimated recovery**

**Why this beats "just use an LLM":**
- Deterministic — same inputs always give same output
- Auditable — every number traceable to the formula
- Explainable — score_breakdown shows exactly why resell beat donate
- No hallucination risk on the business-critical decision

---

### 2c. Circularity Score

Computed in `lib/circularity.ts`. Separate from the disposition decision — a standalone metric on the condition passport.

```
repairability = 0.5 × GRADE_REPAIRABILITY[grade]
              + 0.5 × RISK_REPAIRABILITY[functional_risk]

GRADE_REPAIRABILITY: A=95, A-=85, B+=70, B=50, C=25
RISK_REPAIRABILITY:  none=100, low=85, medium=60, high=30

demand        = CATEGORY_DEMAND[category]
                electronics=85, home_appliances=72, apparel=62, home=55

lifespan      = repairability × 0.9

material      = CATEGORY_MATERIAL_RECOVERY[category]
                electronics=88, home_appliances=78, apparel=32

defect_penalty = min(defect_count × 3, 20)

circularity = round(
    0.30 × repairability
  + 0.25 × demand
  + 0.25 × lifespan
  + 0.20 × material
  − defect_penalty
)
```

**For Bajaj Mixer (A-, low risk, home_appliances, 1 defect):**
```
repairability = 0.5×85 + 0.5×85 = 85
demand        = 72
lifespan      = 85 × 0.9 = 76.5
material      = 78
defect_penalty = 1 × 3 = 3

circularity = 0.30×85 + 0.25×72 + 0.25×76.5 + 0.20×78 − 3
            = 25.5 + 18 + 19.1 + 15.6 − 3 = 75 / 100
```

---

## 3. FEATURE 3 — TRUSTED SECOND-HAND ECOSYSTEM

**What to say:**
> "The biggest barrier to refurbished adoption is trust. Buyers don't know what they're getting. ReLoop solves this with a Condition Passport — a cryptographically stable, AI-generated record attached to every listing."

### How Trust Is Built (Layered)

**Layer 1 — AI Vision Grade (objective)**
- Not self-reported by seller. Gemini 2.5 Flash analyzes actual photos.
- Grade (A to C) + functional_risk + defects[] + accessories_complete + confidence score
- Confidence < 0.6 flags the listing for human review

**Layer 2 — Condition Passport**
- Every listing has a passport modal: grade, circularity score, CO₂ saved, expected lifespan years, warranty months
- Buyers see the actual defect list, not just "good condition"
- Inspection photos shown only if seller uploaded them (no stock photos)

**Layer 3 — Circularity Score (0–100)**
- Independent of seller's claim — computed from grade + category data
- Gives buyers a single number: "how much life is left in this product"

**Layer 4 — Buyer-Seller Match (not random)**
- Items aren't listed blindly. System finds buyers who:
  - Have bought in this category before
  - Have explicitly accepted this grade tolerance
  - Have a matching price band
  - Have eco preference aligned with the listing

**Layer 5 — Listing Flag System**
- If return_reason = "not_as_described" → listing flag event auto-fires
- Product accumulates flags across returns
- Dashboard shows products with ≥2 flags as "seller integrity alerts"
- Protects buyers from repeat mis-described listings

**Layer 6 — Keep-It Negotiation (trust for sellers)**
```
if grade is A or A- AND functional_risk is none or low
AND return_reason is changed_mind or not_as_described:
    offer customer partial refund to KEEP the item
    seller saves reverse logistics cost
    planet avoids CO₂ from return shipment
```
Formula:
```
severity = 0.55 × grade_severity + 0.35 × risk_severity + 0.10 × (defects × 0.05)
refund_share = clamp(0.35 + severity × 0.60, 0.35, 0.70)
refund_amount = clamp(avoided_loss × refund_share, mrp×0.05, mrp×0.40)
seller_saves = avoided_loss − refund_amount
green_credits = round(60 + (refund_amount/mrp) × 120)
```

---

## 4. GREEN CREDITS — SUSTAINABILITY INCENTIVE

**What to say:**
> "Green credits are a behavioral nudge. We reward the customer for choosing the most sustainable path. The more valuable the product and the higher its circularity score, the more credits they earn."

### Formula (in `lib/ev-optimizer.ts`)

```
base_credits (by decision):
  donate    → 80   (most sustainable, highest reward)
  recycle   → 60
  resell    → 50
  refurbish → 40
  exchange  → 30   (lowest effort)

valueMultiplier = clamp(mrp / 5000, 0.5, 2.0)
  → ₹1,299 product  = 0.26 → clamped to 0.5
  → ₹5,000 product  = 1.0
  → ₹29,990 product = clamped to 2.0

circularityMultiplier = 0.7 + (circularity_score / 100) × 0.6
  → circularity 0   → 0.70×
  → circularity 50  → 1.00×
  → circularity 100 → 1.30×

green_credits = round(base × valueMultiplier × circularityMultiplier)
```

### Real Examples

**boAt Airdopes (₹1,299, circularity ~70, resell):**
```
base = 50
valueMultiplier = clamp(1299/5000, 0.5, 2.0) = 0.5
circularityMultiplier = 0.7 + 0.70×0.6 = 1.12
credits = round(50 × 0.5 × 1.12) = 28
```

**Sony WH-1000XM5 (₹29,990, circularity ~85, donate):**
```
base = 80
valueMultiplier = clamp(29990/5000, 0.5, 2.0) = 2.0
circularityMultiplier = 0.7 + 0.85×0.6 = 1.21
credits = round(80 × 2.0 × 1.21) = 194
```

**Bajaj Mixer (₹3,499, circularity 75, resell):**
```
base = 50
valueMultiplier = clamp(3499/5000, 0.5, 2.0) = 0.70
circularityMultiplier = 0.7 + 0.75×0.6 = 1.15
credits = round(50 × 0.70 × 1.15) = 40
```

### Where Credits Accumulate
- Per listing (stored in localStorage under `reloop_my_listings[].green_credits`)
- Account page total = PRESEED_CREDITS (199 from pre-seeded Bombay Dyeing + Nike) + sum from localStorage
- Live sync via `storage` event — no page refresh needed

### Future Roadmap (say for judges)
> "Credits are currently a loyalty ribbon. Roadmap: redeem for free shipping, discount vouchers, or donate to tree-planting NGOs. The formula already captures product value and circularity — the incentive scales with actual environmental impact, not just a flat reward."

---

## 5. OPS DASHBOARD — WHAT IT SHOWS AND HOW

### 4 KPIs
| Metric | Source | How calculated |
|--------|--------|----------------|
| Items Processed | Seeded aggregate + live | Total items through AI pipeline |
| Returns Prevented | Seeded + live prevention banners | Count where customer kept item after banner |
| Value Recovered (₹) | sum(estimated_recovery) across resell+refurb | From EV optimizer per item |
| CO₂ Avoided (kg) | sum(co2_saved_kg) | Fixed per channel: resell=14.2, refurb=8.5, donate=5.8, recycle=3.1 |

**CO₂ source:** Average manufacturing carbon footprint of product category minus end-of-life processing.
Resell avoids the full manufacture of a replacement unit = highest CO₂ saving.

### Disposition Donut
Shows split across resell / refurbish / donate / recycle / exchange for all items processed. Source: seeded data in `/api/dashboard`.

### Monthly Trend
Two lines: Processed (total volume) and Prevented (returns stopped).
Gap between lines shows prevention model improving as data grows.

### Flywheel (5 steps)
```
1. Return Prevention  → fewer returns enter the pipeline
2. AI Vision Grading  → every returned item gets a condition passport
3. Disposition Optimizer → item finds highest-value channel
4. Buyer Matching     → right buyer notified for right item
5. Model Retrains     → disposition outcomes + prevention outcomes
                        feed back to improve both models
                        → loop closes → fewer returns → better grading
```

### Listing Flag Alerts
If `return_reason = "not_as_described"` fires on a product multiple times:
- API returns `flagged_listings[]` with product_id + flag count
- Dashboard shows seller integrity alerts for products with ≥2 flags

---

## 6. BUYER MATCHING — HOW IT WORKS

### Demo Step
> In My Listings, show "Next Best Owners" panel below the Bajaj Mixer listing.
> Point to match %, conversion probability, reason text.

### Scoring Formula (max 114 raw points → normalized to 0–100%)

```
score = 0
+ 40 if buyer.category_affinity includes listing.category
+ 30 if buyer.grade_tolerance includes listing.grade
+ 20 if buyer.price_band = budget AND asking/mrp < 0.55
  (or 15 if mid AND < 0.75, or 10 if premium)
+ round(buyer.eco_preference × 10)   ← 0–10 points
+ min(buyer.previous_refurb_purchases × 3, 9)  ← trust signal
+ 5  if eco_preference > 0.7 AND circularity_score > 70

match_percent = round((score / 114) × 100)
conversion    = 1 / (1 + exp(−8 × (score/114 − 0.5)))  ← logistic curve
```

**Why logistic curve for conversion?**  
Raw match % doesn't map linearly to purchase probability. A buyer who's a 60% match is much more likely to buy than a 30% match — the logistic curve captures this S-curve relationship.

---

## 7. DEMO HAPPY PATH (protect this order)

```
1. Sneha visits Levis Jeans product page
   → Prevention banner fires (risk 0.73, "size mismatch is top return reason here")
   → She reads the tip, stays (return prevented ✅)

2. Ramesh opens My Orders → Bajaj Mixer Grinder
   → Clicks "Return" → Reason: "defective" or "not_as_described"
   → Uploads 2 photos
   → AI grades: A- (Gemini 2.5 Flash)
   → Disposition: RESELL at ₹910, Circularity 75/100, 14.2 kg CO₂ saved
   → EV table shows all 5 channels
   → Clicks "List on Marketplace →" → item saves to localStorage + marketplace

3. Ankit opens Marketplace
   → Sees Bajaj Mixer with Condition Passport
   → Clicks passport → sees grade A-, defects, circularity 75, expected lifespan
   → Match shown: 89% match, 76% conversion probability

4. Ops Dashboard (for Amazon)
   → 4 KPIs: 47 processed, 12 prevented, ₹1.84L recovered, 142.6 kg CO₂
   → Disposition donut: 28 resell, 9 refurbish, 6 donate, 4 recycle
   → Monthly trend: prevention rising relative to processed = flywheel working
   → Listing flag alerts: any mis-described products flagged
```

---

## 8. DEFENSE — QUESTIONS JUDGES WILL ASK

**"It's just an LLM wrapper"**
> "No. Gemini writes one sentence of natural language explanation. Every number — the EV, the score, the decision — is deterministic TypeScript. Same inputs, same output, every time. The LLM is the narrator, not the decision-maker."

**"Your data is synthetic"**
> "Yes, and we're transparent about that. The correlations are realistic and domain-informed: apparel + size mismatch + high return history = high risk. The model architecture would work identically with Amazon's real transaction data — synthetic data lets us move fast without data agreements in a 48-hour hackathon."

**"How is this different from Amazon's existing returns flow?"**
> "Amazon today gives sellers two choices: restock or liquidate. ReLoop adds three missing pieces: (1) AI condition grading that creates a verifiable record, (2) a multi-objective optimizer that finds the highest-value channel instead of defaulting to bulk liquidation, (3) a trust layer so buyers can actually rely on the condition claim."

**"Why not just use GPT-4 for the disposition decision?"**
> "Because GPT-4 is non-deterministic, expensive at scale, can hallucinate business-critical numbers, and gives no audit trail. Our optimizer is deterministic TypeScript — auditable, explainable, and runs in microseconds with no API cost."

**"How did you calculate CO₂ savings?"**
> "Reselling an item avoids manufacturing a replacement — the full embodied carbon of a new unit. For electronics that's ~14 kg CO₂ equivalent. Refurbishing saves less because some materials and energy go into repair. Donating and recycling save progressively less but still divert from landfill. These are industry-standard LCA (Life Cycle Assessment) proxies."

**"What's the business model?"**
> "Amazon takes a listing fee on marketplace transactions (like the existing Renewed program). Green credits create retention — customers who earn credits return to spend them. Sellers benefit from value recovery instead of bulk liquidation write-offs."

---

## 9. TECH STACK SUMMARY

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 15 App Router + TypeScript | SSR + API routes in one repo |
| Styling | Tailwind CSS + shadcn/ui | Rapid, consistent UI |
| Charts | Recharts | Composable, React-native |
| Vision AI | Gemini 2.5 Flash | Best multimodal, free tier adequate |
| Vision fallback | Groq Llama 4 Scout | Zero single point of failure |
| Disposition | TypeScript optimizer | Deterministic, auditable, free |
| Prevention ML | LightGBM + FastAPI (Python) | Best tabular classifier, fast inference |
| Probability calibration | scikit-learn isotonic regression | True calibrated probabilities |
| Local storage | localStorage + IndexedDB | Per-device listing persistence; video files too large for localStorage |
| Synthetic data | Python (`generate_synthetic.py`) | Reproducible, realistic correlations |

---

*Generated: 14 June 2026*
