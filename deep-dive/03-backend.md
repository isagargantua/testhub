# 3. Backend Deep Dive

Three Node/Express apps: **gateway**, **auth-service**, **core-service**. This
chapter walks every backend file. For the request/response shapes of each
endpoint see [06-api-reference.md](./06-api-reference.md); for the data model see
[04-database.md](./04-database.md).

---

## 3.1 Gateway (`gateway/`)

The single public entry point. It does three jobs: **proxy**, **CORS**, and serve
**API docs**. There is no business logic and no database access.

### `src/index.js`
- **Env validation.** Requires `AUTH_SERVICE_URL` and `CORE_SERVICE_URL`; throws
  on boot if either is missing. A `normalizeTarget()` helper prepends `http://`
  if the value has no scheme (Render passes bare `host:port`).
- **CORS allow-list.** Built from `FRONTEND_URL`, `CORS_ORIGIN`,
  `RENDER_EXTERNAL_URL` (so the gateway's own Swagger page can call `/api/*`), and
  localhost:5173/3000. Comma-separated values are split and trimmed. Allowed
  methods: GET/POST/PUT/PATCH/DELETE/OPTIONS; allowed headers: Content-Type,
  Authorization. Unknown origins are rejected with a CORS error.
- **`GET /health`** → `{ status: "ok" }`. Liveness probe; also hit by the
  keep-warm workflow.
- **Docs, mounted before the proxy** so they're served locally, not forwarded:
  - `GET /openapi.json` → the raw spec object from `openapi.js`.
  - `GET /docs` → Swagger UI (`swagger-ui-express`), titled "testHub API Docs".
- **Proxy mounts** (`http-proxy-middleware`), shared `proxyOptions`:
  `changeOrigin: true`, `timeout` & `proxyTimeout` = **120000ms** (tolerates a
  full upstream cold start), `xfwd: true` (forwards `X-Forwarded-For`), and
  `pathRewrite` returning `req.originalUrl` so the **original path is forwarded
  unchanged**.
  - `/api/auth` → auth-service.
  - `[/api/projects, /api/suites, /api/testcases, /api/runs, /api/dashboard,
    /api/dumps]` → core-service.
- Listens on `PORT` (default 3000).

> **Adding a new backend route prefix?** You must add it to the core (or auth)
> proxy mount array here, *and* document it in `openapi.js`.

### `src/openapi.js`
A hand-maintained OpenAPI 3 document describing every endpoint. It is the source
of truth for the `/docs` page and can be imported into Postman. It's hand-written
(not generated), so when you add/change an endpoint, update this file too.

---

## 3.2 auth-service (`auth-service/`)

Owns **identity**: the `User` table, password hashing, JWT issuing/refreshing,
and admin user management.

### `src/index.js`
Minimal bootstrap: `app.set("trust proxy", 1)` (so client IPs resolve correctly
behind the gateway — relevant if rate limiting is ever enabled), `cors()`,
`express.json()`, `morgan("dev")`, `GET /health`, and mounts `routes/auth.js` at
`/api/auth`. Listens on `PORT` (default 3001).

### `src/routes/auth.js` — every endpoint
All bodies validated with `express-validator`; validation failures return
**400** with an `errors` array. Each handler is wrapped in try/catch returning
**500 `{message:"Internal server error"}`** on unexpected errors.

| Endpoint | Notes |
|---|---|
| `POST /register` | Validates name/email/password (min 6). Lowercases email. **If the email already exists → 400 `{message:"User already exists"}`.** Counts users: **the very first user becomes `ADMIN`, everyone else `TESTER`.** Hashes the password with bcrypt (10 rounds), creates the user, returns `{user, accessToken, refreshToken}` with **201**. |
| `POST /login` | Validates email/password. Looks up by email; **wrong email or password both return 401 `{message:"Invalid credentials"}`** (no user-enumeration leak). On success returns `{user, accessToken, refreshToken}`. |
| `GET /me` | Reads the bearer token, `jwt.verify` with `JWT_ACCESS_SECRET`, looks up the user, returns `{id,name,email,role}`. 401 on missing/invalid token, 404 if the user was deleted. |
| `POST /refresh` | Body `{refreshToken}`. Verifies it, re-loads the user, returns a fresh `{accessToken}`. 401 if missing/invalid, 404 if user gone. |
| `POST /logout` | Best-effort: if Redis is configured, blacklists the token until its natural expiry (with a 1s timeout race so a slow Redis never blocks). Always returns `{message:"Logged out successfully"}` even without Redis. |
| `GET /users` | **ADMIN only.** Paginated (`page`, `limit` clamped 1–100, default 10), searchable (`search` matches name OR email, case-insensitive). Returns `{items, pagination}` — `passwordHash` is never selected. |
| `PATCH /users/:id/reset-password` | **ADMIN only.** Body `{password}` (min 6). Hashes and updates. 404 if the user doesn't exist. |
| `DELETE /users/:id` | **ADMIN only.** Guards: **cannot delete your own account** (400) and **cannot delete the last remaining ADMIN** (400). 404 if not found. |

Middleware order on the admin routes is `authLimiter`/`authActionLimiter` →
`verifyToken` → `requireRole("ADMIN")` → validators → handler.

### `src/middleware/auth.js`
- `getBearerToken(req)` — extracts the token after `Bearer ` (returns `null` if
  missing/malformed).
- `verifyToken` — 401 if no token; checks the optional Redis blacklist
  (`isTokenRevoked`, fails open); `verifyAccessToken`; sets `req.user`.
- `requireRole(...roles)` — 401 if no `req.user`, **403** if the role isn't in the
  allowed list.
- `isTokenRevoked(token)` — returns `false` immediately if Redis isn't configured;
  otherwise races a `redis.get` against a 1s timeout so a slow/unavailable Redis
  never blocks auth.

### `src/middleware/rateLimiter.js`
**Opt-in, OFF by default.** Exports `authLimiter` and `authActionLimiter`. Unless
`ENABLE_AUTH_RATE_LIMIT=true`, both are a no-op `(req,res,next)=>next()`. When
enabled: a 15-min window with generous caps (2000 reads / 500 actions),
**keyed by the real client IP** (first `X-Forwarded-For` entry, because traffic
arrives via the gateway), and action limiters use `skipSuccessfulRequests` so a
correct login never burns quota. The long comment block explains *why* it's off:
the proxy chain previously collapsed everyone into one bucket and caused "Too many
login attempts" lockouts with correct credentials.

### `src/utils/jwt.js`
- `generateAccessToken(user)` — payload `{id,email,role}`, secret
  `JWT_ACCESS_SECRET`, expiry `JWT_ACCESS_EXPIRES_IN || "8h"`.
- `generateRefreshToken(user)` — payload `{id}`, secret `JWT_REFRESH_SECRET`,
  expiry `JWT_REFRESH_EXPIRES_IN || "30d"`.
- `verifyAccessToken` / `verifyRefreshToken` — `jwt.verify` against the matching
  secret.

### `src/utils/prisma.js`
Single shared `PrismaClient` with a `globalThis` guard so nodemon hot-reloads
don't spawn a second client. (See [01-architecture.md](./01-architecture.md#14-cross-cutting-design-decisions)
for why one pool matters.)

### `src/utils/redis.js`
Creates an `ioredis` client **only if `REDIS_URL` is set**, with conservative
options (`enableOfflineQueue:false`, bounded retry). Exports `null` if unset, so
every caller treats Redis as best-effort.

### `prisma/schema.prisma`
Just the `User` model + `UserRole` enum (ADMIN/TESTER/VIEWER). auth-service only
runs `prisma generate` on deploy (not `db push`) so it doesn't try to reconcile
its smaller schema against the shared DB — core-service owns migrations.

---

## 3.3 core-service (`core-service/`)

Owns the **domain**. Six route files mounted in `src/index.js` under `/api/*`:
projects, suites, testcases, runs, dashboard, dumps. Every route file calls
`router.use(verifyToken)` first, so **all core endpoints require a valid JWT.**

### Shared helpers

**`src/middleware/auth.js`** — same `verifyToken` / `requireRole` pattern as
auth-service (independent local verification with `JWT_ACCESS_SECRET`, optional
blacklist check).

**`src/utils/http.js`** — three helpers used across routes:
- `parsePagination(query, {defaultLimit=10, maxLimit=100})` — clamps `page`/
  `limit` to safe positive ints (so `?page=abc` can't NaN-crash a query).
- `isNotFoundError(error)` — true when Prisma throws `P2025` (record to
  update/delete not found) → routes map it to **404** instead of 500.
- `csvEscape(value)` — RFC-4180 CSV field escaping, shared by the exporters.

**`src/utils/ownership.js`** — the heart of per-user isolation. Each function
loads the entity, walks up to its owning project's `createdById`, and returns the
entity only if it matches the caller (else `null`):
- `ownedProject(projectId, userId)`
- `ownedSuite(suiteId, userId)` (joins suite → project)
- `ownedTestCase(caseId, userId)` (joins case → suite → project)
- `ownedRun(runId, userId)` (joins run → project)

Routes use these to answer **404** for anything that isn't the caller's — so
"forbidden" and "doesn't exist" look identical.

**`src/utils/prisma.js` / `redis.js`** — same singleton + optional-Redis pattern
as auth-service.

### `src/routes/projects.js`
- `GET /` — paginated list **scoped to `createdById = req.user.id`** (you only
  see your own projects). Returns `{items, pagination}`.
- `POST /` — role ADMIN/TESTER, `name` required; sets `createdById` to the caller;
  **201**.
- `GET /:id` — via `ownedProject`; 404 if missing or not yours.
- `PUT /:id` — owner-checked; updates name/description/status; 404 otherwise.
- `DELETE /:id` — owner-checked; cascades to suites/cases/runs/results via the
  schema; 404 otherwise.

### `src/routes/suites.js`
- `GET /project/:projectId` — lists suites **only if you own the project**.
- `POST /project/:projectId` — ADMIN/TESTER, `name` required, owner-checked.
- `PUT /:id`, `DELETE /:id` — via `ownedSuite`; delete cascades to that suite's
  cases.

### `src/routes/testcases.js`
- `GET /all` — **global library view** of every case you own. Two-step query
  (your projects → their suite IDs → cases by flat `suiteId in [...]`) to dodge
  nested-relation filter edge cases on Render Postgres. Supports `page`, `limit`,
  `search` (title contains, case-insensitive), `projectId`. Each item is enriched
  with its project, suite, full `runs[]` history (runId/runName/runStatus/
  resultStatus/executedAt), and a `latestResult`.
- `GET /export` — downloads the **case catalog** (full authoring detail incl.
  steps/expected/tags, plus latest result) honoring the same `search`/`projectId`
  filters. `?format=csv` (default) or `json`; sets a `Content-Disposition`
  attachment header. Defined before the `/:id` routes so the literal path can't
  collide with the parameterized ones.
- `GET /suite/:suiteId` — paginated cases for one suite (owner-checked).
- `POST /suite/:suiteId` — ADMIN/TESTER, `title` required; accepts
  title/description/steps/expected/priority (default MEDIUM)/tags; sets
  `createdById`; **201**.
- `PUT /:id`, `DELETE /:id` — via `ownedTestCase`.

### `src/routes/runs.js`
- `GET /project/:projectId` — runs for a project you own.
- `POST /project/:projectId` — ADMIN/TESTER, `name` required; stores
  `selectedCaseIds` from the request's `testCaseIds` (the run's scope); **201**.
- `GET /:id` — owner-checked. **Computes the run view**: resolves the in-scope
  cases (the `selectedCaseIds` subset, or all cases in the project's suites if
  none selected), joins each to its `TestResult`, and for unmarked cases emits a
  synthetic `{id:"temp-…", status:"PENDING"}` row. Also returns a `summary`
  counting PASS/FAIL/SKIP/BLOCKED across in-scope cases.
- `POST /:id/results` — ADMIN/TESTER, body `{testCaseId, status, comment?}` with
  `status ∈ {PASS,FAIL,SKIP,BLOCKED}`. **Upserts** on the unique
  `(runId, testCaseId)` — re-marking updates rather than duplicating.
- `PUT /:id` — update name/description/status and optionally `selectedCaseIds`
  (this is how the UI "adds test cases" to an existing run).
- `DELETE /:id` — owner-checked.
- `GET /:id/export?format=csv|json` — downloadable report of in-scope cases joined
  to their results (PENDING where unmarked), as a CSV (default) or JSON
  attachment.

### `src/routes/dashboard.js`
- `GET /stats` — everything **scoped to the caller's projects**. Returns counts
  (`totalProjects`, `activeProjects`, `totalTestCases`, `totalRuns`, `activeRuns`),
  `recentRuns` (latest 5), a `resultBreakdown` {PASS,FAIL,SKIP,BLOCKED},
  `passRatePercent`, and the latest run's per-case results (`latestRunName`,
  `latestRunStatus`, `latestRunResults`). **The breakdown deduplicates to the
  latest result per test case** (a case in 3 runs counts once, by its most recent
  result), so the totals match the number of unique executed cases. Pass rate =
  PASS / total-executed, rounded.
- `GET /results?status=PASS|FAIL|SKIP|BLOCKED` — backs the clickable breakdown:
  every (deduplicated, latest-per-case) result with that status across the
  caller's runs, returning `{id,status,comment,executedAt,testCaseTitle,priority,
  runName}`. Invalid status → 400.

### `src/routes/dumps.js` — the file-storage vault (ADMIN only)
`router.use(verifyToken)` then `router.use(requireRole("ADMIN"))`, so **every dump
endpoint is admin-gated**, and every query is scoped to `uploadedById =
req.user.id` (**per-admin isolation** — one admin never sees another's files).

- Limits (env-overridable): `DUMP_MAX_FILE_MB` (40), `DUMP_MAX_FILES` (20),
  `DUMP_TOTAL_LIMIT_MB` (200 total per admin), `DUMP_ZIP_MAX_MB` (100 per zip
  request). multer uses `memoryStorage` with per-file size + count limits.
- `classify(file)` buckets each upload into `IMAGE | ARCHIVE | TEXT | OTHER` from
  its mime type / extension.
- `GET /` — paginated metadata list (never the bytes) plus a `usage` object
  (`usedBytes`, `limitBytes`, `maxFileBytes`, `maxFiles`) for the quota bar.
- `POST /` — multipart, field name **`files`** (plural), optional `notes`. multer
  errors map to **413** (file too big / too many). Re-checks the running total
  against the per-admin cap → **413** if exceeded. Stores each file's bytes in the
  `DumpItem.content` (bytea) column inside a transaction; **201** with metadata.
- `POST /zip` — body `{ids:[]}`. Size-guards the selection up front (→413 if over
  `ZIP_MAX_BYTES`), then streams a zip via `archiver`, pulling each file's bytes
  one at a time to bound memory and de-duplicating identical filenames. Filename
  `dump-export-<timestamp>.zip`.
- `GET /:id/download` — streams one file's bytes with a sanitized
  `Content-Disposition` filename; 404 if not yours.
- `DELETE /:id` — `deleteMany` scoped to the owner; count 0 → 404 (missing OR not
  yours).

The file's header comment is candid that this is a practice-grade design (bytes in
Postgres, whole-file in-memory streaming, no virus scan) and points at S3/R2 as
the production path.

### `prisma/schema.prisma`
Defines `Project, TestSuite, TestCase, TestRun, TestResult, DumpItem` and all
enums, plus a mirror of `User`. Full details in
[04-database.md](./04-database.md). core-service runs `prisma db push` on deploy
(`npm run deploy`), so it owns the database shape.

Next: [04-database.md](./04-database.md).
