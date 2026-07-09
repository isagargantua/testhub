# 7. Auth, Security, Infrastructure & Deployment

## 7.1 Authentication flow (JWT)

testHub uses **stateless JWTs**: an access token on every request, a refresh token
to mint new access tokens.

- **Access token** — payload `{id, email, role}`, signed with `JWT_ACCESS_SECRET`,
  expires in **8h** (`JWT_ACCESS_EXPIRES_IN`). Sent as `Authorization: Bearer …`.
- **Refresh token** — payload `{id}`, signed with `JWT_REFRESH_SECRET`, expires in
  **30d** (`JWT_REFRESH_EXPIRES_IN`).
- Issued by auth-service on register/login. Stored by the SPA in `localStorage`
  (`accessToken`, `refreshToken`).

**Verification is local and independent.** Both auth-service and core-service
verify the access token themselves using the same `JWT_ACCESS_SECRET`
(`*/src/middleware/auth.js`). core never calls auth at request time, so the two
services don't depend on each other being up.

**Silent refresh** (frontend `client.js`): on a 401 from a non-auth route, the SPA
exchanges the refresh token for a new access token (concurrent 401s share one
in-flight refresh), persists it, and replays the original request. If refresh
fails, it clears tokens and redirects to `/login`.

**Logout** clears tokens locally first (instant UI), then best-effort calls
`POST /api/auth/logout`. If Redis is configured, the access token is blacklisted
until its natural expiry; every blacklist read/write is wrapped in a 1s timeout
race so a slow/absent Redis never blocks auth — it **fails open**.

## 7.2 Authorization (roles)

Two roles are used: **ADMIN** and **TESTER** (`VIEWER` exists in the enum but is
unused). The first registered user becomes ADMIN; everyone else is TESTER.

- `requireRole(...roles)` guards write/admin routes. Missing user → 401; wrong
  role → **403**.
- Reads on core need only a valid token; **writes need ADMIN or TESTER**.
- Admin-only: all `/api/auth/users*` endpoints and all `/api/dumps*` endpoints.
- The frontend mirrors this with `ProtectedRoute roles={["ADMIN"]}` on `/users`
  and `/dump`, and by conditionally rendering admin nav items — but the **server
  is the source of truth** (a TESTER calling an admin route gets 403 regardless of
  UI).

## 7.3 Per-user data isolation

This is the most important security property to understand. Every domain resource
is owned by the user who created its **project** (`Project.createdById`); suites,
cases and runs inherit that owner. `core-service/src/utils/ownership.js` enforces
it on every route, and list/dashboard queries filter by the caller's id. Dumps are
scoped by their own `uploadedById`.

Consequences:
- You only ever see/modify **your own** projects, suites, cases, runs, results,
  and uploaded files.
- "Not yours" returns **404**, identical to "doesn't exist" — no existence leak.
- The dashboard, the global `/testcases/all`, and `/dashboard/results` are all
  owner-scoped too.

## 7.4 Rate limiting (off by default — and why)

`auth-service/src/middleware/rateLimiter.js` is **opt-in**. Unless
`ENABLE_AUTH_RATE_LIMIT=true`, all limiters are no-op pass-throughs. The reason is
a real bug: traffic arrives through a **3-hop proxy chain** (Render LB → gateway →
auth-service), and IP-based keying collapsed every client into one shared bucket,
locking everyone out with "Too many login attempts" — even with correct
credentials. When explicitly enabled, limits are generous (2000 reads / 500
actions per 15-min window), keyed by the **real client IP** (first
`X-Forwarded-For`), and successful actions don't consume quota. The env vars that
once let a stale dashboard value silently shrink the limits were removed on
purpose.

## 7.5 Cold starts (the dominant ops constraint)

Render free services sleep after ~15 min idle and take ~24s+ (up to ~90s when the
gateway *and* an upstream are both cold) to wake. Three layers cope with it:

1. **Warm-up** — `frontend/src/api/warmup.js` pings each service's own `/health`
   directly on load and re-warms on tab refocus (throttled to once/10 min). The
   Login/Register/Sidebar "Wake services" buttons call the long-timeout
   `wakeServices()` and report per-service status.
2. **Transparent retry** — `frontend/src/api/client.js` retries any network error,
   timeout, or 5xx up to 8 times with backoff (~95s budget), so a request landing
   on a waking service just waits, then succeeds.
3. **Keep-warm CI** — `.github/workflows/keep-warm.yml` curls each service's
   `/health` every 14 min during a daily UTC window (`*/14 14-21 * * *`, ≈ a
   late-night IST practice session), deliberately sized to stay under Render's
   **~750 service-hours/month** free budget across 3 services. Widening the window
   risks Render suspending the services mid-month. Also `workflow_dispatch` for
   manual runs.

The gateway's proxy timeout is **120s** to tolerate a full upstream cold start.

## 7.6 Other reliability choices

- **One Prisma client per service** (`*/src/utils/prisma.js`, with a `globalThis`
  hot-reload guard). Fixed random 500s caused by ~5 connection pools per service
  exhausting free-tier Postgres during reconnects.
- **`parsePagination()`** clamps `page`/`limit` so bad query params can't NaN-crash
  a query.
- **`isNotFoundError()`** maps Prisma `P2025` to a clean **404** on update/delete
  instead of a 500.

## 7.7 Environment variables

### gateway
| Var | Purpose |
|---|---|
| `AUTH_SERVICE_URL` | Base URL of auth-service (required; bare host:port ok) |
| `CORE_SERVICE_URL` | Base URL of core-service (required) |
| `FRONTEND_URL`, `CORS_ORIGIN` | Allowed browser origins (comma-separated ok) |
| `RENDER_EXTERNAL_URL` | Auto-set by Render; lets the gateway's own Swagger call `/api/*` |
| `PORT` | Default 3000 |

### auth-service
| Var | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `JWT_ACCESS_SECRET` | HMAC secret for access tokens (**must match core-service**) |
| `JWT_REFRESH_SECRET` | HMAC secret for refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Optional overrides (default 8h / 30d) |
| `REDIS_URL` | Optional; enables the logout blacklist |
| `ENABLE_AUTH_RATE_LIMIT` | Optional; `true` turns on rate limiting (off by default) |
| `PORT` | Default 3001 |

### core-service
| Var | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `JWT_ACCESS_SECRET` | Must match auth-service |
| `REDIS_URL` | Optional blacklist check |
| `PORT` | Default 3002 |
| `DUMP_MAX_FILE_MB` | Per-file upload cap (default 40) |
| `DUMP_MAX_FILES` | Files per upload request (default 20) |
| `DUMP_TOTAL_LIMIT_MB` | Per-admin total storage (default 200) |
| `DUMP_ZIP_MAX_MB` | Max total size per zip request (default 100) |

### frontend (build-time, Vite)
| Var | Purpose |
|---|---|
| `VITE_API_URL` | Gateway base URL (default `http://localhost:3000`) |
| `VITE_AUTH_URL` / `VITE_CORE_URL` | Optional overrides for direct `/health` warm-up if service naming differs |

## 7.8 Deployment

### Backend — Render (`render.yaml`)
A Blueprint defines three web services: `testhub-auth-service`,
`testhub-core-service`, `testhub-gateway`, each `rootDir`-scoped to its folder,
with `healthCheckPath: /health`.
- **auth-service:** `buildCommand: npm install && npm run build` (build runs
  `prisma generate` only — it does **not** `db push`), `startCommand: npm start`.
- **core-service:** `buildCommand: npm install`, `preDeployCommand: npm run deploy`
  (this runs `prisma db push` — **core owns the schema**), `startCommand: npm
  start`.
- **gateway:** receives `AUTH_SERVICE_URL` / `CORE_SERVICE_URL` automatically from
  the other services' Render hostports; `FRONTEND_URL` / `CORS_ORIGIN` are set
  manually.
- Secrets (`DATABASE_URL`, both JWT secrets, `REDIS_URL`) are `sync: false` (set
  in the dashboard / Blueprint prompt). `DEPLOYMENT.md` notes using Neon (Postgres)
  + Upstash (Redis).

### Frontend — Vercel (`frontend/vercel.json`)
- Build command `npm run build`, output `dist`.
- A catch-all rewrite (`/(.*) → /index.html`) so SPA deep links / refreshes work.
- Set `VITE_API_URL` to the deployed gateway URL.

## 7.9 Running locally

```bash
# From the repo root, all four at once (npm workspaces + concurrently):
npm install
npm run dev          # gateway :3000, auth :3001, core :3002, frontend :5173

# Or per service:
cd auth-service && npm install && npm run dev      # :3001
cd core-service && npm install && npm run dev      # :3002  (run `npx prisma db push` first)
cd gateway      && npm install && npm run dev      # :3000
cd frontend     && npm install && npm run dev      # :5173  (talks to the gateway)
```

Set each service's `.env` from its `.env.example` first. The two JWT secrets must
match between auth and core. The frontend reads `VITE_API_URL` (defaults to the
local gateway).

---

That's the whole product. For the high-level summary and the build story, see
[`intro/`](../intro); for the automation suites that test all of this, see
[`intro/components/automation.md`](../intro/components/automation.md).
