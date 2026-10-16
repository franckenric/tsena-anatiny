#!/usr/bin/env bash
# ── Tsena Anatiny — build statique des fronts pour nginx ──────────────────────
# Compile le front-office et le back-office (vite build). Les builds restent
# sur place dans <projet>/dist ; nginx sert directement ces dossiers :
#   /opt/projects/project-ready/tsena-anatiny/tsena-anatiny-front-office/dist
#   /opt/projects/project-ready/tsena-anatiny/tsena-anatiny-back-office/dist
#
# Usage (depuis la racine du projet) :
#   ./deploy/build.sh
#
# A executer la ou nginx sert les fichiers (le serveur). Node 22+ requis.
#
# Les variables de build sont lues dans le .env UNIQUE a la racine du depot
# (envDir des deux vite.config.ts). Verifiez que VITE_API_BASE_URL=/api/v1
# (appels API et images en meme origine, proxifies par nginx vers l'API).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

build_app() {
    local app="$1"
    echo "==> Build $app"
    ( cd "$ROOT/$app" && npm ci && npm run build )
    echo "==> Build pret : $ROOT/$app/dist"
}

build_app tsena-anatiny-front-office
build_app tsena-anatiny-back-office

echo
echo "Termine. Verifiez puis rechargez nginx :"
echo "  sudo nginx -t && sudo systemctl reload nginx"
