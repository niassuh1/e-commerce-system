#!/usr/bin/env bash
#
# Everything in Docker: db, redis, rabbitmq, the Django services, their event consumers and the frontend.
#
# Usage:  bash scripts/docker.sh [command]
#   start [--seed]   build and start everything (default). --seed also loads the dummy data
#   stop             stop and remove the containers (data in ./volumes is kept)
#   logs [service]   follow the logs, e.g. `logs order`
#   seed             load the dummy data into the running stack
#
# Settings come from .env (created from .env.example on first run).

set -euo pipefail
cd "$(dirname "$0")/.."

fail() { echo "ERROR: $1" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || fail "Docker is required: https://docs.docker.com/get-docker/"
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is required."

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

# Value of a variable from .env (with a default), ignoring comments and Windows line endings
env_value() {
  local value
  value=$(grep -E "^$1=" .env | tail -n 1 | cut -d= -f2- | tr -d '\r' | sed 's/[[:space:]]*#.*$//; s/[[:space:]]*$//') || true
  echo "${value:-$2}"
}

# Inside Docker, the app must reach the containers by their service names
check_hosts() {
  local expected actual name
  for pair in POSTGRES_HOST=db REDIS_HOST=redis RABBITMQ_HOST=rabbitmq; do
    name="${pair%%=*}"; expected="${pair#*=}"; actual=$(env_value "$name" "")
    if [ "$actual" != "$expected" ]; then
      fail ".env has $name=${actual:-<unset>}, but Docker needs $name=$expected.
       Copy the Docker defaults:  cp .env.example .env
       (.env.local is the file for running the backend on your machine: bash scripts/dev.sh)"
    fi
  done
}

start() {
  local seed=false
  [ "${1:-}" = "--seed" ] && seed=true

  check_hosts
  echo "==> Building and starting everything (the first build takes a few minutes)"
  docker compose up -d --build

  if $seed; then
    echo "==> Loading dummy data"
    docker compose exec -T store python seed.py
  fi

  echo
  echo "Frontend:     http://localhost:$(env_value FRONTEND_PORT 3003)"
  echo "API services: ports $(env_value STORE_SERVICE_PORT 8000) (store), $(env_value AUTH_SERVICE_PORT 8001) (auth), $(env_value PRODUCT_SERVICE_PORT 8002) (product), $(env_value CART_SERVICE_PORT 8003) (cart), $(env_value ORDER_SERVICE_PORT 8004) (order)"
  echo "RabbitMQ UI:  http://localhost:$(env_value RABBITMQ_MANAGEMENT_PORT 15672)"
  echo
  echo "Status:  docker compose ps"
  echo "Logs:    bash scripts/docker.sh logs"
  echo "Stop:    bash scripts/docker.sh stop"
}

case "${1:-start}" in
  start)  shift || true; start "${1:-}" ;;
  stop)   docker compose down ;;
  logs)   shift || true; docker compose logs -f "$@" ;;
  seed)   docker compose exec -T store python seed.py ;;
  -h|--help|help) sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//' ;;
  *) fail "Unknown command: $1 (try --help)" ;;
esac
