# Dungeon Crawler

A top-down, real-time roguelike in the browser. Fight through 10 procedurally generated floors, pick up weapons and potions, and resume where you left off after logging in.

- **Frontend:** Phaser 3 + TypeScript, built with Vite (repo root, `src/`)
- **Backend:** FastAPI + SQLite, managed with `uv` (`server/`), for accounts and save games

## How to play

| Key                | Action                                      |
| ------------------ | ------------------------------------------- |
| WASD / arrow keys  | Move                                        |
| Space / left click | Attack (click aims the swing at the cursor) |
| E                  | Open a chest you are standing next to       |

Find the gold-lit stairs down on each floor. Chests hold better weapons, enemies sometimes drop potions (more often when you are hurt), and dying sends you back to floor 1. Clear floor 10 to escape. Your run is saved as you play, so logging out (or closing the tab) and logging back in puts you where you left off.

## Quick start (Docker)

The only thing you need is [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine with the Compose plugin).

```sh
git clone <this repo>
cd dungeon-crawler

./run.sh          # macOS / Linux / Git Bash
.\run.ps1         # Windows PowerShell
```

Then open **http://localhost:15173**, register an account and play. The API and its Swagger docs are at http://localhost:18000/docs.

This is dev mode: edits to `src/` hot-reload in the browser and edits to `server/` restart the API.

### Ports

Docker uses different host ports from the non-Docker setup, so both can run at the same time without clashing:

|                   | UI                     | API                    |
| ----------------- | ---------------------- | ---------------------- |
| Local (no Docker) | http://localhost:5173  | http://127.0.0.1:8000  |
| Docker `dev`      | http://localhost:15173 | http://localhost:18000 |
| Docker `prod`     | http://localhost:18080 | http://localhost:18080 |

Each setup also has its own database: local uses `server/game.db`, Docker `dev` keeps one in the `api-data` volume (survives restarts; `docker compose --profile dev down -v` wipes it), and Docker `prod` keeps one inside the container.

### Script commands

`run.sh` and `run.ps1` take the same commands:

| Command         | What it does                                                                          |
| --------------- | ------------------------------------------------------------------------------------- |
| `dev` (default) | UI on http://localhost:15173 and API on http://localhost:18000, both with live reload |
| `prod`          | Builds the production image and runs it. The whole game is at http://localhost:18080  |
| `down`          | Stops and removes the containers                                                      |
| `logs`          | Follows the container logs                                                            |
| `build`         | Builds the production image without running it                                        |

On Windows, if PowerShell refuses to run the script, use `powershell -ExecutionPolicy Bypass -File .\run.ps1`. If `./run.sh` is not executable, use `bash run.sh`.

The scripts wrap Docker Compose, so you can also call it directly: `docker compose --profile dev up --build` or `docker compose --profile prod up --build`.

## Running without Docker

Prerequisites: Node 22+ and [uv](https://docs.astral.sh/uv/).

```sh
# Terminal 1: API on http://127.0.0.1:8000
cd server
uv run fastapi dev main.py

# Terminal 2: UI on http://localhost:5173
npm install
npm run dev
```

VS Code users can also use the **Start Both** launch configuration.

## npm scripts

| Script              | What it does                             |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Vite dev server                          |
| `npm run build`     | Type-check and build the UI into `dist/` |
| `npm run check`     | `typecheck` + `lint` + `test`            |
| `npm run typecheck` | `tsc --noEmit`                           |
| `npm run lint`      | ESLint                                   |
| `npm run test`      | Vitest unit tests for the game logic     |
| `npm run format`    | Prettier                                 |

## Environment variables

| Variable        | Used by         | Default                                       | Notes                                                                                                                               |
| --------------- | --------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`          | Docker image    | `8000`                                        | Port the server listens on inside the container. Render sets this automatically.                                                    |
| `DATABASE_PATH` | API             | `server/game.db`                              | SQLite file. The parent directory is created if missing.                                                                            |
| `CORS_ORIGINS`  | API             | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated. Only matters when the UI and API are on different origins (dev mode). Docker `dev` sets it to the `15173` origins. |
| `STATIC_DIR`    | API             | `dist/` at the repo root                      | If this directory exists, the API also serves the built UI from `/`.                                                                |
| `VITE_API_URL`  | UI (build time) | `http://127.0.0.1:8000`                       | API base URL. Docker `dev` sets `http://localhost:18000`; the production image builds with `""` so the UI calls its own origin.     |

## Deploying to Render

The repo includes a [Render Blueprint](https://render.com/docs/blueprint-spec) (`render.yaml`) that deploys the production `Dockerfile` as a single web service. FastAPI serves both the API and the built UI, so there is no CORS setup.

1. Push the repo to GitHub (or GitLab/Bitbucket).
2. In the Render dashboard, choose **New > Blueprint** and pick the repo.
3. Approve the plan. Render builds the image, checks `/health`, and gives you a public URL.

Every push to the default branch redeploys.

**The database is ephemeral.** SQLite lives on the container filesystem, so accounts and saves are wiped on every deploy or restart. To keep them, attach a Render disk (paid plans) mounted at `/data` and set `DATABASE_PATH=/data/game.db` in `render.yaml`.

## Project layout

```
src/                  Phaser game (TypeScript)
  scenes/             Boot, Auth, Game, HUD, Game Over
  systems/            Combat, floors, lighting, pickups, spawning
  entities/           Player, enemies, chests, projectiles, pickups
  logic/              Pure game rules (dungeon gen, combat, loot, saves) with unit tests
  api/                fetch client, auth and save calls
server/               FastAPI app
  main.py             App, CORS, /health, static UI mount
  auth.py             /auth/register, /auth/login, /auth/logout
  saves.py            GET/PUT /save
  db.py               SQLite connection and schema
Dockerfile            Production image: builds the UI, serves it with FastAPI
docker-compose.yml    `dev` profile (live reload) and `prod` profile (production image)
render.yaml           Render Blueprint
run.sh, run.ps1       One-command start scripts
```
