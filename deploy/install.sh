#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_USER="${SUDO_USER:-$USER}"

echo "[1/5] Vérification de Node.js..."
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js absent, installation de Node 22 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  echo "Node.js déjà installé : $(node -v)"
fi

echo "[2/5] Installation des dépendances..."
cd "$APP_DIR"
npm install --omit=dev

echo "[3/5] Vérification du fichier .env..."
if [ ! -f "$APP_DIR/.env" ]; then
  echo "ERREUR : crée $APP_DIR/.env avec TOKEN et CHANNEL_ID avant de lancer ce script." >&2
  exit 1
fi
chmod 600 "$APP_DIR/.env"

echo "[4/5] Installation du service systemd..."
sudo sed \
  -e "s|__USER__|$APP_USER|g" \
  -e "s|__DIR__|$APP_DIR|g" \
  "$APP_DIR/deploy/voice247.service" \
  | sudo tee /etc/systemd/system/voice247.service >/dev/null
sudo systemctl daemon-reload
sudo systemctl enable --now voice247

echo "[5/5] Service démarré."
sudo systemctl --no-pager status voice247 || true
echo
echo "Logs : sudo journalctl -u voice247 -f"
