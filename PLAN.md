# Dungeon Crawler — 2-Hour Build Plan

Overhead 2D real-time roguelike with a Diablo aesthetic. Phaser 3 handles rendering, input, physics and the real-time loop. rot-js handles dungeon generation and seeded RNG. FastAPI + SQLite handles accounts and save state.

Hard budget: **120 minutes**. Each phase has a time box and a cut line. If a phase runs over, ship its cut line and move on.

---

## Architecture decisions (made up front, not revisited)

| Decision | Choice | Why |
|---|---|---|
| Engine | Phaser 3.90 (already installed) | Arcade physics, sprites, scenes, input, tweens out of the box. Real-time is the default. |
| Map gen | rot-js `Map.Digger` with seeded `RNG` | Rooms + corridors, guaranteed connected. Seeding lets a save store only the seed, not the map. |
| Backend | FastAPI + SQLite via `sqlite3` stdlib, run with `uv` | Zero config, one-file DB, Swagger UI for free. |
| Auth | Username + password, `hashlib.scrypt` hash, opaque session token in `Authorization: Bearer` | No third-party auth deps, no JWT lib. Tokens live in a `sessions` table. |
| Save model | One JSON blob per user: `{ level, seed, hp, maxHp, weaponId, x, y, completed }` | Resume = regenerate floor from seed, place player at saved tile. Enemies respawn on resume (acceptable, documented). |
| Save cadence | On floor change, on death, on logout, and every 10s while playing | Cheap; the blob is tiny. |
| Art | Phases 1–5 use procedurally generated textures (Phaser `Graphics` → `generateTexture`). Phase 6 swaps in a CC0 tileset if time allows. | Guarantees a playable game with zero asset-pipeline risk. |
| Isometric | Not attempted unless Phases 0–6 are done with >15 min left | Explicitly deprioritized by the spec ("if time"). |

## Code layout

Rule: one concern per file, no file over ~150 lines. Scenes orchestrate; game rules live in `logic/` and are unit-testable without Phaser.

```
server/
  main.py              FastAPI app, CORS, router include
  db.py                sqlite connection + schema init
  auth.py              /auth/register, /auth/login, /auth/logout, current_user dependency
  saves.py             GET/PUT /save
  models.py            pydantic request/response models
  pyproject.toml

src/
  main.ts              Phaser.Game config, scene list
  config.ts            constants: tile size, 10 levels, API base URL
  api/
    client.ts          fetch wrapper with bearer token
    auth.ts            register / login / logout
    saves.ts           loadSave / putSave
    session.ts         token persistence (localStorage)
  logic/               pure TS, no Phaser imports, vitest-covered
    dungeon.ts         generateFloor(seed, level) -> { grid, entrance, exit, rooms }
    enemies.ts         enemy type table (6 kinds: stats, colour, behaviour tag)
    weapons.ts         weapon table + damage calc
    loot.ts            chest / health-drop roll logic
    combat.ts          damage application, death check
    save.ts            SaveState type + default
  scenes/
    BootScene.ts       generate placeholder textures
    AuthScene.ts       login / create-account form
    GameScene.ts       builds floor, spawns entities, wires systems
    HudScene.ts        health bar, floor counter, weapon name, logout button
    GameOverScene.ts   death + victory screens
  entities/
    Player.ts          movement, attack input, hp
    Enemy.ts           per-type AI (chase / wander / ranged), hp
    Chest.ts           open -> weapon drop
    HealthPickup.ts
    Projectile.ts
  systems/
    SpawnSystem.ts     places enemies/chests per floor using rot-js RNG
    CombatSystem.ts    overlap handlers between player, enemies, projectiles
    FloorSystem.ts     exit detection, level transition, win condition
    SaveSystem.ts      periodic + event-driven save calls
```

---

## Phase 0 — Backend (15 min)

Goal: `uv run fastapi dev main.py` serves auth + save endpoints.

1. `server/pyproject.toml` with `fastapi[standard]`.
2. `db.py`: tables `users(id, username UNIQUE, pw_hash, salt)`, `sessions(token, user_id, created)`, `saves(user_id PRIMARY KEY, state JSON, updated)`.
3. `auth.py`: register (409 on duplicate), login (401 on bad creds), logout (delete token), `current_user` dependency.
4. `saves.py`: `GET /save` returns blob or `null`, `PUT /save` upserts.
5. CORS for `http://localhost:5173`.

Verify: curl register → login → PUT save → GET save round-trips.

**Cut line:** skip the server-side logout endpoint; the client just drops the token.

## Phase 1 — Auth flow in the client (15 min)

Goal: open the app, create an account, log in, land in the game.

1. `api/` modules.
2. `AuthScene`: HTML form overlay (login / create tabs), error text, dark styling.
3. On success: fetch `/save`. If present, start `GameScene` with that state, else with the default state.
4. `HudScene` logout button: calls `putSave`, then `/auth/logout`, returns to `AuthScene`.

**Cut line:** a single form with both "Log in" and "Create account" buttons instead of tabs.

## Phase 2 — Dungeon generation + player movement (20 min) ✅ Completed

Goal: walk around a seeded, connected floor with a visible entrance and exit.

1. `logic/dungeon.ts`: `generateFloor(seed, level)` seeds `ROT.RNG` with `seed + level` and runs `Map.Digger`. Entrance = centre of the first room. Exit = centre of the room farthest from it by BFS distance over floor tiles, so the two are always connected.
2. Unit test: 50 random seeds → exit reachable from entrance, both on floor tiles.
3. `BootScene` generates textures: floor, wall, stairs down, stairs up, player, 6 enemy colours, chest, potion.
4. `GameScene`: render the grid as a static tilemap layer with wall collision, spawn `Player` with WASD/arrows, camera follow, dark vignette + low ambient tint for mood.
5. `FloorSystem`: overlap with exit → `level + 1`, regenerate. Exit on level 10 → `GameOverScene(victory)`.

**Cut line:** drop the vignette; rectangle sprites are fine.

**Notes:** Nothing cut. Lighting is a Light2D torch on the player, plus a glow on the exit and a camera vignette (WebGL only). Extras: `logic/enemies.ts` holds only kind ids and colours so far (Phase 3 adds stats). `GameOverScene` exists with victory/death copy. The HUD shows a "Floor N / 10" banner on arrival. `GameScene.snapshot()` records the player's tile, and a valid saved tile is used as the spawn point.

## Phase 3 — Combat: enemies, weapons, health (30 min)

Goal: real-time fights that can kill you, with 6 distinct enemy kinds.

1. `logic/enemies.ts` table. Stats scale with floor number.

   | Kind | Behaviour | Notes |
   |---|---|---|
   | Skeleton | chase | baseline |
   | Zombie | chase, slow, high hp | tank |
   | Bat | erratic wander, fast, low hp | swarm |
   | Cultist | ranged, keeps distance | fires projectiles |
   | Ghoul | chase, lunges when close | burst damage |
   | Lich | ranged, summons bats on hit | floors 7+ only |

2. `Enemy.ts` reads the behaviour tag and runs a small state machine in `preUpdate`.
3. `Player.ts`: attack on Space or click, swing hitbox in facing direction, 300ms cooldown, brief invulnerability after being hit.
4. `logic/weapons.ts`: Rusty Dagger (start), Short Sword, War Axe, Flail, Runed Blade. Each has damage, cooldown, reach.
5. `Chest.ts`: open on overlap + E, rolls a weapon at or above the current tier via `loot.ts`.
6. `HealthPickup.ts` + `loot.ts`: on enemy death, drop chance scales inversely with player hp (`< 30%` hp → 60% chance, otherwise 15%).
7. `HudScene` health bar (red over dark, flashes on damage), weapon name, floor `N / 10`.
8. Death → `GameOverScene(death)`, resets save to level 1.

**Cut line:** Lich and Ghoul become stat/colour variants of Cultist/Skeleton. Still 6 kinds, less distinct AI.

## Phase 4 — Persistence + resume (15 min)

Goal: log out mid-floor, log back in, and you are on the same floor at the same spot with the same weapon and hp.

1. `SaveSystem`: `putSave` every 10s, on floor change, on death, on logout, and on `beforeunload` (keepalive fetch).
2. On `GameScene` boot with a save: regenerate the floor from `seed`, place the player at `(x, y)`.
3. Victory sets `completed: true`. Logging in with a completed save shows "You escaped — play again?" and resets on confirm.

**Cut line:** drop the `beforeunload` save.

## Phase 5 — Polish and QA pass (15 min)

1. Play through 3 floors; fix anything blocking.
2. Juice, in priority order: hit flash, screen shake on damage, enemy death particle burst, torch flicker (random tint pulse on a few wall tiles).
3. `npm run check` clean. README with run instructions for both servers.
4. Commit.

## Phase 6 — Art (10 min, only if Phases 0–5 shipped)

Swap generated textures for a CC0 tileset (candidate: 0x72 "DungeonTileset II" on itch.io, 16px, Diablo-adjacent). Only `BootScene` changes, since everything else references texture keys. If pulling assets eats more than 10 minutes, revert.

## Stretch (outside the budget)

- Isometric projection (Phaser isometric tilemap orientation + sprite depth sort).
- Enemy state persisted in the save.
- Leaderboard endpoint (fastest clear).

---

## Timeline

| Phase | Minutes | Cumulative |
|---|---|---|
| 0 Backend | 15 | 15 |
| 1 Auth client | 15 | 30 |
| 2 Dungeon + movement | 20 | 50 |
| 3 Combat | 30 | 80 |
| 4 Persistence | 15 | 95 |
| 5 Polish / QA | 15 | 110 |
| 6 Art | 10 | 120 |

## Spec coverage

| Requirement | Where |
|---|---|
| Overhead 2D, real-time | Phaser arcade physics, Phases 2–3 |
| Random dungeon, always an entrance and exit | `logic/dungeon.ts` + unit test, Phase 2 |
| 10 levels, finish on the last | `FloorSystem`, `config.ts` |
| Login / account creation, one account per player | FastAPI `auth.py`, `AuthScene` |
| Health bar | `HudScene` |
| 6 enemy kinds | `logic/enemies.ts` |
| Weapons in chests | `Chest.ts`, `logic/weapons.ts` |
| Health drops when low | `logic/loot.ts` |
| Resume where you left off | `SaveSystem`, Phase 4 |
| Logout button | `HudScene` |
| Easy-to-navigate code | one concern per file, `logic/` is Phaser-free |
| Diablo aesthetic | dark palette, vignette, CC0 tileset in Phase 6 |

## How to run (target state)

```
# terminal 1
cd server && uv run fastapi dev main.py

# terminal 2
npm run dev
```
