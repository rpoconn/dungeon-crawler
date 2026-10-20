#!/usr/bin/env bash
# Start the game with Docker. Usage: ./run.sh [dev|prod|down|logs|build]
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker was not found on your PATH. Install Docker Desktop: https://www.docker.com/products/docker-desktop/" >&2
  exit 1
fi

cmd="${1:-dev}"
case "$cmd" in
  dev)
    echo "UI:  http://localhost:15173"
    echo "API: http://localhost:18000/docs"
    docker compose --profile dev up --build
    ;;
  prod)
    echo "Game: http://localhost:18080"
    docker compose --profile prod up --build
    ;;
  down)
    docker compose --profile dev --profile prod down
    ;;
  logs)
    docker compose --profile dev --profile prod logs -f
    ;;
  build)
    docker compose --profile prod build
    ;;
  *)
    echo "Usage: $0 [dev|prod|down|logs|build]" >&2
    exit 1
    ;;
esac
