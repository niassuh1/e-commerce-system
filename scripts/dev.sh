#!/usr/bin/env bash
#
# Development mode:
#   - db, redis and rabbitmq run in Docker
#   - the Django services (and their event consumers) run on this machine
#   - the frontend runs on this machine with `pnpm dev` (hot reload)
#
# Usage:  bash scripts/dev.sh [--seed]
#   --seed   also load the dummy data (resets seeded products' prices and stock)
#
# Settings come from .env.local. Stop everything with Ctrl+C (Docker keeps running; `docker compose down` stops it).

set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE=".env.local"
SEED=false

for arg in "$@"; do
  case "$arg" in
    --seed) SEED=true ;;
    -h|--help) sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $arg (try --help)"; exit 1 ;;
  esac
done

fail() { echo "ERROR: $1" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || fail "'$1' is required. $2"; }

# --- Checks -------------------------------------------------------------------
need docker "Install it from https://docs.docker.com/get-docker/"
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is required."
need node "Install Node.js 22+ from https://nodejs.org"
need pnpm "Install it with: npm install -g pnpm"

if command -v python3 >/dev/null 2>&1; then PYTHON=python3
elif command -v python >/dev/null 2>&1; then PYTHON=python
else fail "Python 3.13+ is required."; fi

[ -f "$ENV_FILE" ] || fail "$ENV_FILE not found."
# docker-compose.yml lists .env as an env_file, so it must exist even though dev mode doesn't use it
[ -f .env ] || { cp .env.example .env; echo "Created .env from .env.example"; }

# --- Environment --------------------------------------------------------------
# Exported variables win over .env, so the backend uses .env.local. `tr` strips Windows line endings.
set -a
# shellcheck disable=SC1090
source <(tr -d '\r' < "$ENV_FILE")
set +a

# This machine reaches the containers through the ports Docker publishes, never the in-network ports
export POSTGRES_PORT="${POSTGRES_HOST_PORT:-5432}"
export REDIS_PORT="${REDIS_HOST_PORT:-16379}"
export RABBITMQ_PORT="${RABBITMQ_HOST_PORT:-5672}"

# --- Infrastructure -----------------------------------------------------------
echo "==> Starting db, redis and rabbitmq in Docker"
docker compose --env-file "$ENV_FILE" up -d --wait db redis rabbitmq

# --- Backend ------------------------------------------------------------------
if [ ! -d .venv ]; then
  echo "==> Creating virtual environment (.venv)"
  "$PYTHON" -m venv .venv
fi
if [ -x .venv/bin/python ]; then VENV_PY=.venv/bin/python; else VENV_PY=.venv/Scripts/python.exe; fi

echo "==> Installing backend dependencies"
"$VENV_PY" -m pip install -q -r requirements.txt

echo "==> Running migrations"
"$VENV_PY" runserver.py migrate

if $SEED; then
  echo "==> Loading dummy data"
  "$VENV_PY" seed.py
fi

# --- Frontend -----------------------------------------------------------------
echo "==> Installing frontend dependencies"
(cd frontend && pnpm install)

# --- Run ----------------------------------------------------------------------
pids=()
cleanup() {
  trap - EXIT INT TERM
  echo
  echo "==> Stopping backend and frontend"
  for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo
echo "==> Backend services:  ports ${STORE_SERVICE_PORT:-8000}-${ORDER_SERVICE_PORT:-8004}"
echo "==> Frontend:          http://localhost:3003"
echo "==> RabbitMQ UI:       http://localhost:${RABBITMQ_MANAGEMENT_PORT:-15672}"
echo "==> Press Ctrl+C to stop"
echo

"$VENV_PY" runserver.py all &
pids+=($!)

(cd frontend && exec pnpm dev) &
pids+=($!)

wait
