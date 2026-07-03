# ReLoop — Architecture, Workflow & Scaling

A single reference for how ReLoop works today, where it bottlenecks, and exactly
how it scales to production — with every AWS service explained in plain language.

---

## 1. What ReLoop is (one line)

An AI returns platform that **prevents avoidable returns before purchase**, and when a
return still happens, uses AI grading + deterministic economics to **route each item to
its best next owner** — creating value for buyers, sellers, and Amazon at once.

---

## 2. Current Architecture (deployed today)

Everything runs on **one AWS EC2 VM** behind nginx with HTTPS.

```
                        ┌──────────── BROWSER (buyer / seller / ops) ────────────┐
                        │        https + wss  →  52-71-221-255.sslip.io          │
                        └───────────────────────────┬────────────────────────────┘
                                                     │ TLS (ZeroSSL cert, auto-renew)
┌──────────────────────────── AWS EC2 · single VM (t3.medium) ───────────────────────────┐
│  2 vCPU · 4 GB RAM · Ubuntu 26.04 · Elastic IP · 30 GB disk · 2 GB swap · MTU 1500       │
│  Security Group: 22 (my IP) · 80 · 443                                                   │
│                                                                                         │
│   ┌───────────────────── nginx :443  (TLS termination + reverse proxy) ────────────┐   │
│   │   location /               → 127.0.0.1:3000   (Next.js)                         │   │
│   │   location /vision-stream  → 127.0.0.1:8000   (FastAPI WebSocket, YOLO)         │   │
│   └───────────┬──────────────────────────────────────────┬─────────────────────────┘   │
│               │                                           │                             │
│   ┌───────────▼────────────┐   loopback :8000   ┌─────────▼───────────────┐             │
│   │ reloop-web (systemd)    │──────────────────▶│ reloop-ml (systemd)      │            │
│   │ Next.js 16 · :3000      │   POST /predict    │ FastAPI · uvicorn · :8000│            │
│   │ • SSR pages             │                    │ • LightGBM prevention .pkl│           │
│   │ • /api/* route handlers │                    │ • YOLOv8n live vision (WS)│           │
│   └───────────┬─────────────┘                    └──────────────────────────┘           │
│               │ outbound HTTPS                                                           │
│               ▼                                                                          │
│   Gemini 2.5 Flash (grade + reasoning + triage) · Groq Llama 4 (vision fallback)        │
│                                                                                         │
│   State: static synthetic JSON/CSV in-repo + browser localStorage (cart, listings)      │
│   Secrets: next-app/.env.local + ml-service/.env  (not in git)                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**Layers:**

| Layer | Component | Runs as |
|---|---|---|
| Edge | nginx — TLS, reverse proxy, WebSocket upgrade | system service |
| Web | Next.js 16 — SSR pages + all `/api/*` handlers | `reloop-web` :3000 |
| ML | FastAPI — LightGBM `/predict`, YOLOv8 `/vision-stream` | `reloop-ml` :8000 |
| Process mgmt | systemd — auto-restart on crash + reboot | — |
| AI (external) | Gemini 2.5 Flash, Groq Llama 4 Scout | SaaS APIs |
| State | static synthetic data + browser localStorage | in-repo / client |

---

## 3. End-to-End Workflow

**Journey A — Prevention (before purchase):**
```
1. Customer opens a product page
2. Next calls POST /api/prevention/score  → proxies to FastAPI /predict
3. LightGBM (calibrated) returns risk 0–1 + top_driver
4. UI intervenes:
     risk > 0.60  → red banner + size guidance   (return likely avoided)
     risk 0.40-60 → soft amber nudge
     risk < 0.40  → nothing (no false alarms)
```

**Journey B — Recovery (a return happens):**
```
1. Start return → pick reason → upload photos OR record 15s video
2. /api/grade → Gemini 2.5 Flash vision → structured grade JSON
     (grade, functional_risk, defects, packaging, confidence)
     [fallback: Groq Llama 4 → deterministic mock]
3. /api/disposition → TypeScript optimizer computes Expected Value across
     5 channels and picks the best (this is MATH, not the LLM):
        Final = 0.5·normalize(EV) + 0.3·Sustainability + 0.2·Trust
        decision = argmax(Final)
     Gemini then writes ONE explanation sentence.
4. Item gets an AI Product Passport (grade, defects, photos, circularity, CO₂)
5. Listed on marketplace → buyer-matching ranks the best next owner
6. Ops dashboard aggregates: value recovered, CO₂ saved, disposition mix, flywheel
```

**The flywheel:** every return feeds prevention (fewer future returns) and supplies the
marketplace (trusted second-life inventory). Each loop strengthens the next.

---

## 4. Bottlenecks — Current vs Production Fix

| # | Bottleneck (single VM) | Why it limits scale | Production fix | AWS service |
|---|---|---|---|---|
| 1 | Single VM, no redundancy | VM dies → whole app down | containers behind auto-scaling load balancer, multi-AZ | ECS/Fargate + ALB |
| 2 | FastAPI 1 worker + CPU YOLO | vision inference CPU-bound, serialized | dedicated GPU / managed vision, parallel per item | SageMaker / Rekognition |
| 3 | Next.js single Node process | one event loop; requests queue | horizontal replicas behind LB, or serverless | Fargate / Lambda |
| 4 | No caching | every GET recomputes + resends | edge CDN + in-memory cache | CloudFront + ElastiCache |
| 5 | State in browser localStorage | not shared/persisted → can't add instances | shared managed database + object store | DynamoDB + S3 |
| 6 | Synchronous AI pipeline | slow Gemini call blocks the request | event-driven, decoupled stages | SQS + Lambda |
| 7 | External API rate limits | Gemini/Groq cap grading throughput | managed model endpoints in-account | Bedrock / SageMaker |
| 8 | Vertical RAM ceiling (4 GB) | YOLO+torch+Next contend | scale out, not up | Auto Scaling Group |
| 9 | Dashboard recomputes aggregates | expensive at volume | pre-aggregate on write | DynamoDB Streams |

---

## 5. What We Use NOW to Scale (and how)

Current strategy = **vertical scaling + scale-ready design**. Honest framing:

- **nginx reverse proxy** — single public entry; becomes a load balancer later with no app change.
- **Stateless services** — web + ML keep no session state → can be replicated horizontally without a rewrite.
- **Stage decoupling** — prevention / grade / disposition / matching are independent → each scales on its own metric.
- **systemd auto-restart** — crash + reboot recovery (resilience).
- **Fallback chains** (Gemini → Groq → mock) — graceful degradation instead of hard failure under load.
- **loopback internal calls + swap** — low-latency Next↔ML + RAM cushion.

## 6. Free Optimizations Available NOW (raise per-VM capacity, $0)

| Change | Effect |
|---|---|
| `Cache-Control` headers on deterministic GET APIs | ~90% read-load drop (browser/proxy caches) |
| nginx `gzip` | ~70% smaller JSON/JS payloads |
| nginx HTTP/2 | multiplex many requests over one connection |
| nginx micro-cache (1–5s) on GET `/api/*` | absorbs traffic bursts before Node |
| `<img loading="lazy">` | faster first paint, less client work |
| uvicorn `--workers 2` (RAM permitting) | 2× concurrency on `/predict` |

---

## 7. Production Scaling Architecture (target)

```
                              Route 53 (DNS)  +  ACM (TLS cert)
                                        │
                                 CloudFront (CDN, global edge cache)
                                        │
                                 ALB (Application Load Balancer)
                        ┌───────────────┼────────────────┐
                        ▼               ▼                 ▼
                 Fargate: web     Fargate: web      Fargate: web   ← auto-scaling replicas
                        │
            ┌───────────┼─────────────────────────────────────────┐
            ▼           ▼                     ▼                     ▼
     API Gateway   SQS (queue)          ElastiCache          S3 (images/video)
            │           │                (Redis cache)
            ▼           ▼
      SageMaker    Lambda workers ──▶ Bedrock / Rekognition (vision grading)
      (prevention)      │
                        ▼
                   DynamoDB (returns, dispositions, listings)
                        │
                   DynamoDB Streams ──▶ pre-aggregated dashboard
                        │
              CloudWatch + X-Ray (metrics, tracing, alarms)
```

---

## 8. AWS Services Glossary (what each thing IS + why ReLoop uses it)

> Read this so you can answer "what is X and why" for any service on the diagram.

### Compute

**EC2 (Elastic Compute Cloud)** — *what it is:* a rented virtual server (a VM) in AWS.
*ReLoop today:* the whole app runs on one EC2 instance. *Scales by:* bigger instance
(vertical) or many instances behind a load balancer.

**ECS + Fargate (Elastic Container Service / serverless containers)** — *what it is:* runs
Docker containers without you managing servers; Fargate provisions the compute per
container automatically. *Why ReLoop:* package Next.js + FastAPI as containers, run many
copies, auto-scale on CPU/requests. *Replaces:* manually managing the single VM.

**EKS (Elastic Kubernetes Service)** — *what it is:* managed Kubernetes. *Why:* only if we
outgrow Fargate and need fine-grained orchestration across many services. Heavier than we
need early on — Fargate first.

**Lambda (serverless functions)** — *what it is:* run code on demand with no server; scales
to zero when idle, to thousands of parallel executions under load; pay per invocation.
*Why ReLoop:* stateless API steps (disposition math, matching) and pipeline workers.
*Replaces:* always-on processes for bursty work. *Scales:* automatically per request.

**Auto Scaling Group (ASG)** — *what it is:* automatically adds/removes instances based on
load (CPU, request count). *Why:* return traffic is bursty (post-sale, festivals) — ASG
grows during spikes, shrinks after, so you don't pay for idle capacity.

### AI / ML

**SageMaker** — *what it is:* AWS's platform to train and **host ML models** as
auto-scaling API endpoints. *Why ReLoop:* serve the LightGBM prevention model as a managed
endpoint (`<100ms`, auto-scales, versioned) instead of our single FastAPI process.
*Replaces:* the `/predict` service. *Scales:* endpoint auto-scaling + caching.

**Bedrock** — *what it is:* AWS's **managed generative-AI service** — call foundation models
(Anthropic Claude, Amazon Titan, Meta Llama, etc.) through one AWS API, inside your account,
with AWS security/billing. *Why ReLoop:* replace the external Gemini/Groq calls for grading
+ reasoning with an in-account model → no third-party rate limits, data stays in AWS,
enterprise compliance. *Replaces:* Gemini 2.5 Flash / Groq. *Scales:* fully managed, no
infra; you just call the API.

**Rekognition** — *what it is:* AWS's ready-made **computer-vision API** (object/defect/label
detection, no model training). *Why ReLoop:* an alternative to running YOLO ourselves for
condition detection — managed, scales automatically. *Trade-off:* less custom than our own
model; we'd A/B it against Bedrock vision.

### Storage & Data

**S3 (Simple Storage Service)** — *what it is:* unlimited object storage (files, images,
video) accessed by URL. *Why ReLoop:* store return photos/videos and passport media instead
of the VM's local disk. *Replaces:* local file storage. *Scales:* effectively infinite,
pay per GB, 99.999999999% durability.

**DynamoDB** — *what it is:* AWS's **serverless NoSQL database** — single-digit-ms reads,
auto-scales, on-demand pricing. *Why ReLoop:* store returns, disposition records, and
marketplace listings so state is shared across instances and persisted (today it's browser
localStorage + static files). *Replaces:* localStorage / static JSON. *Scales:*
automatically to any request volume.

**DynamoDB Streams** — *what it is:* a change-feed that fires whenever a DynamoDB item
changes. *Why ReLoop:* every new disposition record triggers an update to pre-computed
dashboard aggregates → the Ops dashboard reads cheap totals instead of recomputing.

**ElastiCache (Redis)** — *what it is:* managed in-memory cache. *Why ReLoop:* cache hot
data — prevention scores, marketplace listings — for sub-millisecond reads and to shield
the DB/models from repeat queries. *Replaces:* recomputing every request.

### Networking & Delivery

**CloudFront (CDN)** — *what it is:* a global content-delivery network — caches responses at
edge locations near users. *Why ReLoop:* serve static assets + cacheable API responses from
the edge → faster worldwide, far less origin load. *Scales:* absorbs global traffic at the edge.

**ALB (Application Load Balancer)** — *what it is:* distributes incoming requests across many
healthy instances/containers. *Why ReLoop:* the moment we run >1 web/ML replica, ALB spreads
traffic + health-checks them. *Replaces:* nginx as the single entry (nginx logic moves to ALB
+ container-level).

**API Gateway** — *what it is:* a managed "front door" for APIs — routing, throttling, auth,
rate-limiting. *Why ReLoop:* put it in front of the SageMaker prevention endpoint + Lambda
APIs for throttling, keys, and caching.

**Route 53** — *what it is:* AWS DNS. *Why:* map a real domain to the load balancer, health-
based routing, multi-region failover. *Replaces:* the sslip.io demo hostname.

**ACM (Certificate Manager)** — *what it is:* free, auto-renewing TLS certificates for AWS
services. *Why:* HTTPS on CloudFront/ALB without manual certbot. *Replaces:* our ZeroSSL cert.

### Messaging & Async

**SQS (Simple Queue Service)** — *what it is:* a managed message queue that buffers work
between stages. *Why ReLoop:* decouple grade → disposition → listing so a slow vision call
doesn't block the request, and return-season **spikes queue up** instead of overloading.
*Scales:* absorbs 10× bursts; workers drain at their own pace.

**SNS (Simple Notification Service)** — *what it is:* pub/sub notifications (fan-out to email,
SMS, other services). *Why ReLoop:* notify sellers of buyer matches / listing flags, alert
ops on repeated flags.

### Observability

**CloudWatch** — *what it is:* metrics, logs, alarms for everything in AWS. *Why:* see CPU,
latency, error rates; alarm before things break; drive auto-scaling decisions.

**X-Ray** — *what it is:* distributed tracing across services. *Why:* find *which* stage
(prevention / grade / disposition) is the bottleneck under load, with real numbers.

### Auth (future, multi-sided)

**Cognito** — *what it is:* managed user auth (sign-up, login, tokens). *Why ReLoop:* real
buyer / seller / Amazon-ops accounts + roles (today auth is mocked). *Replaces:* mocked users.

---

## 9. Scaling Roadmap (phased)

| Phase | What | Cost | Outcome |
|---|---|---|---|
| **0 — Now** | single EC2, nginx, systemd | ~$ few | works end-to-end, demo-ready |
| **1 — Free wins** | caching headers, gzip, HTTP/2, micro-cache | $0 | several× per-VM capacity |
| **2 — De-risk state** | move media → S3, records → DynamoDB, add Cognito auth | low | multi-instance ready, persistent |
| **3 — Horizontal** | containerize → Fargate + ALB + Auto Scaling, CloudFront | pay-per-use | survives spikes + zone outage |
| **4 — Managed AI** | prevention → SageMaker, vision/grading → Bedrock/Rekognition | pay-per-request | no external limits, in-account |
| **5 — Async at scale** | SQS + Lambda pipeline, DynamoDB Streams dashboard | pay-per-use | absorbs 10× return-season load |

---

## 10. The One-Liner (for your mentor)

> "Today ReLoop runs end-to-end on one VM — scaled vertically, but deliberately built
> **stateless and stage-decoupled**. Free per-VM wins (caching, gzip) come first. For real
> scale, each stage maps 1:1 to a managed AWS service — **Fargate/Lambda** for compute,
> **SageMaker** for our model, **Bedrock/Rekognition** for vision, **S3 + DynamoDB** for
> state, **SQS** for burst absorption, **CloudFront** for edge. So scaling ReLoop is a
> **deployment migration, not a redesign** — and we tackle bottlenecks in order:
> caching → state/DB → async pipeline → GPU/managed vision."
