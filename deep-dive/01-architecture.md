# 1. Architecture & How It Was Built

## 1.1 The shape of the system

testHub is a **microservices** application with four deployable apps:

```
                          ┌──────────────────────────────┐
                          │      Frontend (React SPA)    │
                          │   Vercel · Vite · Tailwind   │
                          └───────────────┬──────────────┘
                                          │  HTTPS (axios, Bearer JWT)
                                          ▼
                          ┌──────────────────────────────┐
                          │           Gateway            │
                          │ Express · http-proxy · CORS  │
                          │ /docs (Swagger) · /health    │
                          └───────┬───────────────┬──────┘
                 /api/auth/*      │               │   /api/projects, /suites,
                                  ▼               ▼   /testcases, /runs,
                   ┌────────────────────┐   ┌────────────────────┐  /dashboard, /dumps
                   │    auth-service    │   │    core-service    │
                   │ Express · Prisma   │   │ Express · Prisma   │
                   │ bcrypt · JWT issue │   │ JWT verify (local) │
                   └─────────┬──────────┘   └─────────┬──────────┘
                             │                        │
                             └───────────┬────────────┘
                                         ▼
                                ┌──────────────────┐
                                │   PostgreSQL     │   (+ optional Redis for
                                │  (Prisma schema) │    JWT blacklist; fails open)
                                └──────────────────┘
```

Why four apps instead of one? Three reasons, all deliberate:

1. **It's a realistic automation target.** Real systems under test are rarely a
   single monolith; a gateway + services topology gives more surface to automate
   against (proxying, CORS, independent health, role-gated routes).
2. **Decoupled identity.** auth-service issues tokens; core-service *verifies them
   locally* with the same secret. core never calls auth at request time, so an
   auth restart never logs core users out.
3. **Operational learning.** Running several free-tier services forced solutions
   to cold starts, connection-pool limits, and proxy-induced rate-limit bugs.

## 1.2 The four apps at a glance

| App | Tech | Port (local) | Responsibility |
|---|---|---|---|
| `gateway/` | Express, http-proxy-middleware, swagger-ui-express | 3000 | The **only public API entry point.** Proxies by path prefix, enforces CORS, serves `/health` and `/docs`. |
| `auth-service/` | Express, Prisma, bcryptjs, jsonwebtoken, express-validator | 3001 | **Identity.** Register/login/refresh/logout, `/me`, and ADMIN user management. Owns the `User` table. |
| `core-service/` | Express, Prisma, multer, archiver, express-validator | 3002 | **The domain.** Projects, suites, test cases, runs, results, dashboard aggregates, and the file-storage vault. |
| `frontend/` | React 19, Vite, Tailwind, React Router 7, axios, Recharts | 5173 | The SPA. Talks only to the gateway via `VITE_API_URL`. |

PostgreSQL is shared by both services (auth owns `User`, core owns everything
else). Redis is optional and only used for a best-effort JWT blacklist on logout.

## 1.3 An end-to-end request, worked

**"User logs in, opens a project, creates a run, marks a test PASS."**

1. **Login.** SPA `POST /api/auth/login` → gateway → auth-service. auth-service
   compares the bcrypt hash, signs an **access token (8h)** and a **refresh token
   (30d)**, and returns both with the user object. The SPA stores both tokens in
   `localStorage` (`accessToken`, `refreshToken`).
2. **Authenticated calls.** axios attaches `Authorization: Bearer <access>` to
   every request (request interceptor). A response interceptor (a) **transparently
   retries cold-start failures** (network error / timeout / any 5xx) with backoff,
   and (b) on a 401 from a non-auth route, **refreshes the access token once** and
   replays the request; if refresh fails it clears tokens and redirects to /login.
3. **Open the dashboard.** `GET /api/dashboard/stats` → gateway → core-service.
   core verifies the JWT *locally* (no call to auth), then runs a batch of counts
   plus a deduplicated PASS/FAIL/SKIP/BLOCKED breakdown — **all scoped to the
   signed-in user's own projects.**
4. **Create a run.** `POST /api/runs/project/:projectId` with `testCaseIds`. core
   checks the caller owns the project, then stores a `TestRun` whose
   `selectedCaseIds` scopes it to those cases.
5. **Mark a result.** `POST /api/runs/:id/results` with `{testCaseId, status}`.
   core **upserts** a `TestResult` keyed by `(runId, testCaseId)` — re-marking a
   case updates the row instead of duplicating it.
6. **Export (optional).** `GET /api/runs/:id/export?format=csv|json` streams a
   downloadable report joining each in-scope case to its recorded result.

## 1.4 Cross-cutting design decisions

These themes recur throughout the code; understanding them up front makes every
file read easier.

### Per-user data isolation
Every domain resource is owned by the user who created its **project**
(`Project.createdById`). Suites, cases, and runs hang off a project, so their
owner is the project's owner. core-service has a helper module
(`core-service/src/utils/ownership.js`) with `ownedProject / ownedSuite /
ownedTestCase / ownedRun`, which return the entity only if the caller owns it
(else `null` → the route answers **404**). The dashboard and the global test-case
view filter the same way. Net effect: a user can never see or touch another
user's data, and "not yours" is indistinguishable from "doesn't exist."

### Local JWT verification
Both services verify access tokens themselves using a shared `JWT_ACCESS_SECRET`
(`*/src/middleware/auth.js`). No inter-service auth call exists, so the services
are independent at request time.

### Cold starts (the dominant operational constraint)
Render free services sleep after ~15 min idle and take ~24s+ to wake. Mitigations
are layered:
- **Frontend warm-up** (`frontend/src/api/warmup.js`) pings each service's own
  `/health` directly on load and re-warms on tab refocus (throttled).
- **Transparent retry** (`frontend/src/api/client.js`) retries any network error,
  timeout, or 5xx up to 8 times with backoff (~95s budget).
- **Keep-warm CI** (`.github/workflows/keep-warm.yml`) pings `/health` every 14
  min during a daily window, kept under the ~750 service-hours/month free budget.

### Single Prisma client per service
Each service exports **one** shared `PrismaClient` singleton
(`*/src/utils/prisma.js`). Previously each route file did `new PrismaClient()`,
opening ~5 pools per service and exhausting free-tier Postgres connections during
cold-start reconnects — which surfaced as random 500s.

### Rate limiting is opt-in and OFF by default
A 3-hop proxy chain (Render LB → gateway → auth) collapsed IP-based rate limiting
into one shared bucket and locked everyone out. So auth-service's limiters are
no-op pass-throughs unless `ENABLE_AUTH_RATE_LIMIT=true`
(`auth-service/src/middleware/rateLimiter.js`).

### Additive dark mode
Light/dark theme is a `data-theme` attribute on `<html>`, set **before first
paint** by an inline script in `frontend/index.html` (no flash). Dark styles are
an *additive* CSS layer scoped to `[data-theme="dark"]`, so light mode is
byte-for-byte unchanged.

## 1.5 How it was built (the short version)

testHub was built conversationally ("vibe-coded") with a tester's eye for making
the product *testable*: predictable status codes, consistent JSON envelopes,
pagination everywhere, and clear error contracts. The build hit — and fixed —
several real production problems, each turned into a regression test in the
automation suites:

- **Proxy-induced rate-limit lockout** → made rate limiting opt-in/off.
- **Cascading cold starts** → warm-up + retry + keep-warm CI.
- **Prisma connection-pool exhaustion** → one shared client per service.
- **Bad pagination input crashing routes** → a `parsePagination()` clamp helper.
- **Shipping dark mode without breaking light** → additive CSS layer + pre-paint
  script.

The full first-person story is in
[`intro/PROJECT_STORY.md`](../intro/PROJECT_STORY.md).

## 1.6 Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 3, React Router 7, axios, Recharts |
| Gateway | Node, Express 4, http-proxy-middleware, swagger-ui-express, morgan |
| Services | Node, Express 4, Prisma 5, jsonwebtoken, bcryptjs, express-validator, ioredis (optional); core also uses multer + archiver |
| Database | PostgreSQL (Prisma ORM) |
| Hosting | Render (backend, free tier), Vercel (frontend) |

Next: [02-repository-map.md](./02-repository-map.md) for the file-by-file tour.
