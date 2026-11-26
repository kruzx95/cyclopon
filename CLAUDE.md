# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

CycloPon is a live GPS tracking platform for long-distance cycling events (Gran Fondo, Audax, ultra-cycling). Riders' phones push coordinates via the Traccar Client app (OsmAnd protocol) or an in-browser PWA tracker; spectators watch a live map, leaderboard, and checkpoint splits. Node.js + Express 5 monolith, SQLite (WAL) via `better-sqlite3`, vanilla-JS SPA, deployed with Docker Compose + Caddy.

UI copy and code comments are in **Indonesian**. Keep new user-facing strings in Indonesian.

## Commands

```bash
npm start                 # production server (node server.js), port 3000
npm run dev               # nodemon auto-reload
npm test                  # node --test — runs every tests/*.test.js
node --test tests/results.test.js        # single test file
node --test --test-name-pattern="COT"    # filter by test name
npm run benchmark         # 100 concurrent WS viewers + 200 HTTP burst, prints P50/P95/P99
npm run seed:demo         # create a realistic demo event (10 riders, splits, history)
npm run simulate         # stream fake GPS movement along the GPX route, live over WS
npm run clean:data        # purge demo/test data (refuses when NODE_ENV=production without --force)
npm run deploy:vps       # auto-commit dirty tree, push master, SSH pull + rebuild on VPS
```

There is no linter or build step. `node_modules` must be installed (`npm install`) before tests.

## Architecture

### Request flow (`server.js`)

Single Express app, exported as both `module.exports` and `module.exports.httpServer`. Order matters:

1. Security headers → `compression` → JSON/urlencoded/cookie parsers.
2. `/gpx/*.gpx` is guarded by `requireEventAccess` **before** the static handler so a PIN-locked event cannot be bypassed by fetching the raw route file.
3. `express.static('public')` with per-extension cache headers.
4. Page-view middleware — only `GET` non-`/api` paths without a dot; buffers into `lib/traffic-queue.js` (in-memory, flushed in batches of 50 / every 2s, pruned daily).
5. API routers mounted at overlapping prefixes (`/api`, `/api/events`, `/api/admin/...`). `/api/osmand` and `/osmand` are mounted **first** so telemetry ingest is never shadowed by a generic `/api` middleware.
6. SPA fallback: serves `public/index.html` with Open Graph tags injected per-route (`/`, `/watch/:id`, `/events/:id`) via `lib/og-infograph.js`. Non-production re-reads the file each request; production caches it.
7. `/api` 404 JSON handler, then a centralized error handler (skips logging when `NODE_ENV === 'test'`; maps `MulterError` to 400).

`lib/traccar-ws-proxy.js` is attached to the same HTTP server at path `/traccar-ws` and is a **singleton**: one upstream WebSocket to Traccar, fanned out to all browser clients, each scoped to an `event_id`. Clients without `event_id` receive no telemetry (prevents bypassing event access PINs). Telemetry is also persisted to `position_history`, throttled to one write per rider per second.

### Data layer (`db/database.js`)

- Schema is defined **inline** in `db/database.js` as `CREATE TABLE IF NOT EXISTS` blocks. `db/schema.sql` is a reference dump, not executed.
- Migrations are idempotent `try { db.exec('ALTER TABLE ...') } catch (e) {}` statements after the schema block. Add new columns this way; never edit an existing `CREATE TABLE` and assume it applies to live DBs.
- All queries are pre-exported prepared statements on `module.exports` (e.g. `db.createEvent.run({...})`, `db.getRiderById.get(id)`). Add new statements there rather than calling `db.db.prepare` in routes, except for dynamic SQL in `routes/osmand.js`.
- Tables: `events`, `riders`, `alerts`, `checkpoints`, `rider_splits`, `position_history`, `virtual_dnf`, `sponsors`, `settings`, `page_views`, `ala_ultra_config`, `ala_ultra_registrations`.
- DB file lives at `data/cyclopon.db` (gitignored, Docker volume). **There is no test database** — tests open the same file, so every test must clean up the rows it creates.

### Domain modules

- **`lib/virtual-cot.js`** — "Virtual COT": a cut-off marker that starts at the route origin at a WIB time and advances at a constant km/h pace; riders behind it are written to `virtual_dnf`. All math is pure epoch arithmetic (Indonesia has no DST, offset fixed at +7h). Modes: `off` / `dry_run` / `live`, plus a global kill switch `VIRTUAL_COT_ENABLED`. Route GPX is cached in-memory (`ROUTE_CACHE`) and evaluations in `EVAL_CACHE` (TTL `VIRTUAL_COT_EVAL_TTL_SEC`).
- **`lib/event-access.js`** — event-level access PIN. Riders supply BIB + personal PIN + event PIN. `sanitizeEvent()` strips `access_pin` from every public payload while exposing `access_pin_required`. Failed attempts are throttled per IP+event (429 after 10 in 15 min). Exports `requireEventAccess` middleware used by GPX static, WS, and public APIs.
- **`lib/admin-auth.js`** — HMAC-signed admin session tokens kept in an in-memory `Map` (24h TTL). Accepted via cookie `cyclopon_admin`, `Authorization: Bearer`, or `x-admin-token`. `safeStringCompare` is timing-safe. `requireAdminAuth` guards every admin route.
- **`lib/og-infograph.js` + `lib/fast-canvas.js` + `lib/png-font.js`** — dependency-free OG image rendering (1200×630) straight to PNG, with a hand-rolled 8×8 bitmap font.
- **`lib/xlsx.js` + `lib/ala-ultra-export.js`** — zero-dependency XLSX (SpreadsheetML) writer built on `node:zlib`; used for ALA Ultra registration reports.
- **`routes/ala-ultra.js`** — self-contained registration module (public `publicRouter` for submit/info, `adminRouter` for config, verification, sync-to-rider, proof upload, XLSX export). Proof files land in `data/ala-ultra-proofs/`.

### Frontend (`public/`)

- Vanilla-JS SPA. `public/js/router.js` is a minimal path-pattern router (`/watch/:eventId`); `public/js/app.js` registers every page and lazily loads its script + CSS via `loadPageDeps()`.
- Pages live in `public/js/pages/`, shared helpers in `public/js/lib/` (`gpx-utils.js`, `card-*` for share cards, `gps-keeper.js` for the in-browser tracker). Several of these are **also `require()`d by tests and by `routes/ala-ultra.js`**, so they must stay DOM-free at module load.
- Cache busting is manual: bump the `?v=NNN` query on `app.js` / page scripts in `public/index.html` and `public/js/app.js`, and bump `CACHE_NAME` in `public/sw.js` (currently `cyclopon-v132`). Forgetting this ships stale code to PWA users.
- Service worker: network-first for app assets and GPX, cache-first for CDN (Leaflet, fonts), never falls back to `index.html` for media.
- A global `fetch` interceptor in `public/js/lib/utils.js` auto-attaches the admin bearer token to `/api/admin*` and `/api/events/admin*` requests.
- Rendering is `innerHTML`-based — always pass user data through `escapeHtml()`.

### Conventions

- Dark theme palette: `#0D1117` background, `#00E5FF` cyan accent, `#FF6B35` orange. Rider colors come from `lib/constants.js` (`RIDER_COLORS`, role colors for `sweeper` / `marshall` / `medic`).
- Branding: use the Orbit Cyclo-Eye mark (`/icons/cyclopon-mark.svg`, `-dark.svg`, `app-icon-*.png`). Do **not** reintroduce the old emblem/monogram logos, and do not append taglines after the `CYCLOPON` wordmark.
- Coding discipline: minimal, surgical changes; no drive-by refactors or reformatting; preserve backward compatibility with the live SQLite volume; verify with `npm test` before declaring done.

## Testing notes

- Tests use `node:test` + `node:assert/strict`, spin up the real Express app on an ephemeral port (`server.listen(0)`), and hit it over HTTP.
- Because they share `data/cyclopon.db`, each suite creates its own event/rider and deletes them in a `teardown` subtest. Follow that pattern — leaked rows break later runs.
- Some tests assert on source text (e.g. regex-matching `public/js/pages/register.js` for element IDs). Renaming a DOM id or attribute can fail a test even when behavior is fine.

## Deployment

Production is Docker Compose (`docker-compose.prod.yml`): Caddy (auto-SSL, 80/443 + HTTP/3) → `cyclopon-app` (Node 22, port 3000) → Traccar (OsmAnd port 5055). Persistent volumes: `cyclopon_data` (SQLite), `cyclopon_gpx`, `cyclopon_uploads`. `npm run deploy:vps` auto-commits any dirty tree, pushes `master`, then pulls and rebuilds on the VPS (`VPS_IP` / `VPS_USER` / `VPS_DIR` env overrides). See `DEPLOYMENT.md` and `DEPLOY_COMMANDS.md` for the manual runbook and backup/restore.
