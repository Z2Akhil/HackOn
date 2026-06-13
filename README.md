# ReLoop — Second Life Commerce

> AI-powered returns & sustainable resale · HackOn with Amazon 6.0 · 13–14 June 2026

**One-liner:** ReLoop prevents the returns that shouldn't happen, and for the ones that do, it recovers the maximum value by intelligently routing each item to its next best owner.

---

## Quick Start

```bash
# 1. Generate synthetic data (once)
python data/generate_synthetic.py

# 2. Train the return-prevention model (once)
python models/train_prevention.py

# 3. Start the Python ML microservice (terminal 1)
cd ml-service
uvicorn main:app --port 8000 --reload

# 4. Start the Next.js app (terminal 2)
cd app
npm install   # first time only
npm run dev   # http://localhost:3000
```

The Next.js app works standalone without the Python service — it falls back to a deterministic mock so the demo never breaks.

**Demo credentials:** all users pre-mocked, no login required.

---

## 3 Load-Bearing AI Features

### 1. Return Prevention (`/api/prevention/score`)
LightGBM GBM predicts return probability for `(customer × product × variant)` before purchase.
- Risk > 0.6 → intervention banner + variant suggestion
- Risk 0.4–0.6 → soft nudge
- Risk < 0.4 → no interruption
- Model trained on 2,000 synthetic rows with realistic correlations (apparel + "runs small" + high return history → high risk)

### 2. Condition Grading + Multi-Objective Disposition Optimizer
**Grading** (`/api/grade`): Gemini 2.5 Flash vision analyzes uploaded photos → structured JSON with `grade, functional_risk, defects, packaging_status, accessories_complete, confidence`.

**Disposition** (`/api/disposition`): pure TypeScript optimizer picks the best channel across `resell | refurbish | donate | recycle | exchange`.

```
Final Score = 0.5 × normalize(EV) + 0.3 × Sustainability_Score + 0.2 × Trust_Score
decision    = argmax(Final Score)

EV_resell    = P(sells | grade, category) × resale_price − relisting_cost − logistics
EV_refurbish = P(repair_ok) × refurb_resale_price − refurb_cost − logistics
EV_donate    = csr_value + tax_benefit − logistics
EV_recycle   = salvage_material_value − processing_cost

Sustainability weights: donate=1.0, recycle=0.85, refurbish=0.75, resell=0.70
Trust weights:          resell=0.90, exchange=0.80, refurbish=0.70, donate=0.60
```

**Circularity Score** (`/lib/circularity.ts`): 0–100 index on every item.
```
circularity = 0.30×repairability + 0.25×demand + 0.25×lifespan + 0.20×material_recovery − defect_penalty
```

Gemini 2.5 Flash narrates the numeric decision in 2 sentences — LLM is the narrator, not the decision-maker.

### 3. AI Product Passport + Marketplace + Next-Best-Owner Matching
- Every graded listing gets a **passport**: grade, defects, circularity score, CO₂ saved, estimated lifespan, warranty months
- **6-factor buyer matching**: category affinity + grade tolerance + price fit + eco preference + prior refurb purchases + circularity affinity
- `GET /api/marketplace` — listings with full passports
- `GET /api/match/[itemId]` — ranked buyer candidates with reasons

---

## Monorepo Structure

```
/app           Next.js 16 App Router — UI + all TypeScript API routes
  /app/api/    Route handlers (grade, disposition, prevention, marketplace, match, dashboard)
  /lib/        ev-optimizer.ts · circularity.ts · static-data.ts
  /components/ DispositionCard · PassportModal · PreventionBanner · GradeCard
/ml-service    Python FastAPI — LightGBM return-prevention model (/predict)
/data          Synthetic datasets + generate_synthetic.py
/models        Pickled model + train_prevention.py
```

---

## AWS Production Architecture

| Demo component | Production AWS | How it scales |
|---|---|---|
| Image upload (local) | S3 + event trigger | Unlimited objects |
| AI grading (sync) | S3 → Lambda → Bedrock | Each return processed independently |
| Pipeline glue | SQS between stages | Buffers return-season spikes |
| Disposition + storage | Lambda + DynamoDB | Stateless, auto-scales |
| Prevention inference | API Gateway + SageMaker endpoint | < 100ms latency, cacheable |
| Dashboard aggregates | DynamoDB Streams → pre-computed | Read-cheap |

---

## Sustainability Impact

Every disposition decision tracks: CO₂ saved vs. manufacturing new, circularity score, e-waste diverted, landfill avoided. Visible on the Ops Dashboard and every product passport.

---

## Team
HackOn with Amazon 6.0 · Second Life Commerce theme
