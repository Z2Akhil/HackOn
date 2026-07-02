#!/usr/bin/env bash
# ReLoop single-VM provisioner — Ubuntu 24.04 LTS. Run as the `ubuntu` user.
# Usage:  bash provision.sh <REPO_GIT_URL> <PUBLIC_HOST>
#   e.g.  bash provision.sh https://github.com/Z2Akhil/hackon.git 12-34-56-78.sslip.io
set -euo pipefail

REPO_URL="${1:?need git repo url}"
PUBLIC_HOST="${2:?need public host, e.g. 12-34-56-78.sslip.io}"
APP_DIR=/opt/reloop

echo "==> 1/8 System packages"
sudo apt-get update -y
sudo apt-get install -y git nginx python3-venv python3-pip curl \
  libgl1 libglib2.0-0            # OpenCV runtime libs

echo "==> 2/8 Node.js 20 (NodeSource)"
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "==> 3/8 Swap (2G cushion for torch/next build)"
if [ ! -f /swapfile ]; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

echo "==> 4/8 Clone / update repo into ${APP_DIR}"
sudo mkdir -p "$APP_DIR"
sudo chown -R "$USER":"$USER" "$APP_DIR"
if [ -d "$APP_DIR/.git" ]; then git -C "$APP_DIR" pull; else git clone "$REPO_URL" "$APP_DIR"; fi

echo "==> 5/8 ML service (venv + deps + train model)"
cd "$APP_DIR/ml-service"
python3 -m venv .venv
./.venv/bin/pip install --upgrade pip
# CPU-only torch FIRST so ultralytics does not drag in the ~2.5G CUDA build.
./.venv/bin/pip install torch --index-url https://download.pytorch.org/whl/cpu
./.venv/bin/pip install -r requirements.txt
[ -f .env ] || sed "s/SERVER_NAME_PLACEHOLDER/${PUBLIC_HOST}/" \
  "$APP_DIR/deploy/ml.env.example" > .env
# prevention_model.pkl is gitignored, so it is NOT in the clone.
# Train it on the VM (reproducible; venv has lightgbm + sklearn).
if [ ! -f "$APP_DIR/models/prevention_model.pkl" ]; then
  echo "    training prevention model..."
  ( cd "$APP_DIR" && ml-service/.venv/bin/python models/train_prevention.py )
fi

echo "==> 6/8 Next.js (install + build)"
cd "$APP_DIR/next-app"
npm ci
if [ ! -f .env.local ]; then
  sed "s/SERVER_NAME_PLACEHOLDER/${PUBLIC_HOST}/" \
    "$APP_DIR/deploy/web.env.example" > .env.local
  echo "!! EDIT $APP_DIR/next-app/.env.local and add GEMINI_API_KEY / GROQ_API_KEY, then rerun the build."
fi
npm run build

echo "==> 7/8 systemd units"
sudo cp "$APP_DIR/deploy/reloop-ml.service"  /etc/systemd/system/
sudo cp "$APP_DIR/deploy/reloop-web.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now reloop-ml reloop-web

echo "==> 8/8 nginx"
sudo sed "s/SERVER_NAME_PLACEHOLDER/${PUBLIC_HOST}/" \
  "$APP_DIR/deploy/nginx-reloop.conf" | sudo tee /etc/nginx/sites-available/reloop >/dev/null
sudo ln -sf /etc/nginx/sites-available/reloop /etc/nginx/sites-enabled/reloop
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo
echo "Base stack up on http://${PUBLIC_HOST}"
echo "Now enable HTTPS (required for camera):"
echo "  sudo apt-get install -y certbot python3-certbot-nginx"
echo "  sudo certbot --nginx -d ${PUBLIC_HOST} --redirect -m you@email.com --agree-tos -n"
echo "Then: sudo systemctl restart reloop-ml reloop-web"
