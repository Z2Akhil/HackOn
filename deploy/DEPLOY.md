# ReLoop — AWS EC2 Deployment (Next.js + ML service on one VM)

Single VM runs **both** the Next.js app and the FastAPI ML service (LightGBM prevention
+ YOLOv8 live vision). Nginx fronts them with TLS; the browser only ever hits Nginx.

```
Browser ──https/wss──> Nginx :443 ──┬─ /               -> Next.js :3000
                                     └─ /vision-stream  -> FastAPI :8000 (WebSocket)
Next.js ──localhost:8000──> FastAPI /predict   (internal, not public)
```

---

## Part A — Create the VM (AWS Console)

1. **EC2 → Launch instance.**
   - Name: `reloop`
   - AMI: **Ubuntu Server 24.04 LTS** (x86_64)
   - Instance type: **t3.medium** (2 vCPU / 4 GB). *Free-tier micro = 1 GB = OOM on torch/next build.*
   - Key pair: create/download `reloop.pem` (used for SSH).
   - Storage: **30 GB gp3**.
2. **Network / Security group** — create `reloop-sg` with inbound:
   | Type  | Port | Source            | Why                     |
   |-------|------|-------------------|-------------------------|
   | SSH   | 22   | **My IP**         | admin only              |
   | HTTP  | 80   | 0.0.0.0/0         | certbot + redirect      |
   | HTTPS | 443  | 0.0.0.0/0         | app + wss               |
   Do **not** open 3000 or 8000 — they stay internal.
3. **Launch**, then **EC2 → Elastic IPs → Allocate → Associate** to this instance
   (so the IP survives reboots). Note it, e.g. `12.34.56.78`.
4. Your public host = the IP with dots→dashes + `.sslip.io`:
   `12.34.56.78` → **`12-34-56-78.sslip.io`** (resolves to your IP, no domain purchase).

---

## Part B — Provision (on the VM)

SSH in:
```bash
chmod 400 reloop.pem
ssh -i reloop.pem ubuntu@12.34.56.78
```

Run the provisioner (clones repo, installs Node+Python+nginx, builds both, trains the
prevention model, starts both systemd services, configures nginx):
```bash
curl -fsSL https://raw.githubusercontent.com/Z2Akhil/HackOn/main/deploy/provision.sh -o provision.sh
bash provision.sh https://github.com/Z2Akhil/HackOn.git 12-34-56-78.sslip.io
```
> If the repo is private, `git clone` first with a token, then run
> `bash /opt/reloop/deploy/provision.sh <url> <host>`.

**Add your API keys** (the build ran with placeholders):
```bash
nano /opt/reloop/next-app/.env.local     # set GEMINI_API_KEY, GROQ_API_KEY
cd /opt/reloop/next-app && npm run build  # rebuild with keys
sudo systemctl restart reloop-web
```

---

## Part C — HTTPS (mandatory — browser camera needs it)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d 12-34-56-78.sslip.io --redirect -m you@email.com --agree-tos -n
sudo systemctl restart reloop-ml reloop-web
```
Certbot rewrites the nginx block to serve 443 + auto-renews. `ALLOWED_ORIGINS` in
`/opt/reloop/ml-service/.env` already points at `https://...` so the WS handshake passes.

Open **https://12-34-56-78.sslip.io** — test prevention banner, a return + grade, and
the live triage camera (only works over https).

---

## Part D — Operate

```bash
sudo systemctl status reloop-ml reloop-web   # health
journalctl -u reloop-ml  -f                  # ML logs (YOLO, /predict)
journalctl -u reloop-web -f                  # Next logs
curl localhost:8000/health                   # {"status":"ok","model_loaded":true}
```

**Deploy a new version:**
```bash
cd /opt/reloop && git pull
cd next-app && npm ci && npm run build && sudo systemctl restart reloop-web
# if ml-service/ or models changed:
sudo systemctl restart reloop-ml
```

---

## Files in this folder
| File | Goes to | Purpose |
|---|---|---|
| `provision.sh` | run once on VM | end-to-end setup |
| `reloop-ml.service` | `/etc/systemd/system/` | FastAPI unit |
| `reloop-web.service` | `/etc/systemd/system/` | Next.js unit |
| `nginx-reloop.conf` | `/etc/nginx/sites-available/reloop` | reverse proxy (+ WS) |
| `ml.env.example` | `/opt/reloop/ml-service/.env` | ALLOWED_ORIGINS, YOLO |
| `web.env.example` | `/opt/reloop/next-app/.env.local` | Gemini/Groq keys, ML_SERVICE_URL |

## Gotchas already handled
- **WS URL** was hardcoded `ws://localhost:8000`; now origin-relative → `wss://<host>/vision-stream` via nginx.
- **prevention_model.pkl is gitignored** → provisioner trains it on the VM.
- **CUDA torch bloat** → provisioner installs CPU-only torch.
- **Camera** blocked without HTTPS → Part C is required, not optional.
- **CORS/WS origin** → `ALLOWED_ORIGINS` must equal your https origin.
</content>
