# testHub — Architecture & End-to-End Overview

> **What testHub is:** a small but realistic **test-management platform** (think
> a mini TestRail). It exists as a **practice target** for QA test automation —
> Postman/RestAssured for the API and Selenium/Playwright for the UI — and as a
> hands-on full-stack/"vibe-coding" project. It runs entirely on **free-tier
> hosting** (Render + Vercel), which shapes several design decisions.

This document is the single best place for a new engineer (or an AI agent picking
up the project) to understand the whole system. Component deep-dives live in
[`docs/components/`](./components), and the build story is in
[`PROJECT_STORY.md`](./PROJECT_STORY.md).

---

## 1. The big picture

testHub is a **microservices** app: a React SPA talking to an API gateway that
proxies to two backend services backed by one PostgreSQL database.

```
                          ┌──────────────────────────────┐
                          │      Frontend (React SPA)      │
                          │   Vercel · Vite · Tailwind     │
                          └───────────────┬────────────────┘
                                          │  HTTPS (axios, Bearer JWT)
                                          ▼
                          ┌──────────────────────────────┐
                          │           Gateway              │
                          │ Express · http-proxy · CORS    │
                          │ /docs (Swagger) · /health      │
                          └───────┬───────────────┬────────┘
                 /api/auth/*      │               │   /api/projects, /suites,
                                  ▼               ▼   /testcases, /runs, /dashboard
                   ┌────────────────────┐   ┌────────────────────┐
                   │    auth-service     │   │    core-service     │
                   │ Express · Prisma    │   │ Express · Prisma    │
                   │ bcrypt · JWT        │   │ JWT verify (local)  │
                   │ users, login, token │   │ projects/suites/    │
                   └─────────┬──────────┘   │ cases/runs/results  │
                             │              └─────────┬──────────┘
                             │   ┌────────────────────┘
                             ▼   ▼
                       ┌──────────────────┐        ┌───────────────────┐
                       │   PostgreSQL      │        │  Redis (optional)  │
                       │  (Prisma schema)  │        │  JWT blacklist     │
                       └──────────────────┘        └───────────────────┘
```

**Key architectural facts**
- The **gateway** is the only public entry point for the API. It proxies by path
  prefix and serves interactive **OpenAPI docs at `/docs`**.
- **auth-service** owns identity: users, password hashing, and JWT issuing.
- **core-service** owns the domain: projects → suites → test cases → runs →
  results, plus dashboard aggregates and run export.
- **JWTs are verified independently** in each service using a shared
  `JWT_ACCESS_SECRET`. core-service does *not* call auth-service to validate a
  token — so an auth-service restart never logs core users out. This decoupling
  is deliberate.
- Each service has its **own Prisma client** (a singleton per service) and they
  share one Postgres database (auth owns `User`; core owns everything else).

---

## 2. Repository tree (top level)

```
testHub/
├── gateway/                  # API gateway (Express + http-proxy-middleware)
│   └── src/
│       ├── index.js          # proxy routes, CORS, /health, /docs mount
│       └── openapi.js        # hand-maintained OpenAPI 3 spec (served at /docs)
│
├── auth-service/             # Identity service
│   ├── prisma/schema.prisma  # User model
│   └── src/
│       ├── index.js          # app bootstrap, trust proxy, /health
│       ├── routes/auth.js     # register, login, me, refresh, logout, users CRUD
│       ├── middleware/
│       │   ├── auth.js        # verifyToken, requireRole, getBearerToken
│       │   └── rateLimiter.js # OPT-IN rate limiting (off by default)
│       └── utils/
│           ├── jwt.js         # sign/verify access & refresh tokens
│           ├── prisma.js      # shared PrismaClient singleton
│           └── redis.js       # optional ioredis client (fails open)
│
├── core-service/             # Domain service (the actual test-management data)
│   ├── prisma/schema.prisma  # Project, TestSuite, TestCase, TestRun, TestResult
│   └── src/
│       ├── index.js          # app bootstrap, /health, route mounting
│       ├── routes/
│       │   ├── projects.js    # project CRUD (paginated list)
│       │   ├── suites.js      # suites within a project
│       │   ├── testcases.js   # test cases within a suite (paginated)
│       │   ├── runs.js        # runs, result upsert, CSV/JSON export
│       │   └── dashboard.js   # aggregate stats (counts, pass rate, breakdown)
│       ├── middleware/auth.js # independent JWT verification
│       └── utils/
│           ├── prisma.js      # shared PrismaClient singleton
│           ├── http.js        # parsePagination(), isNotFoundError() (P2025->404)
│           └── redis.js       # optional blacklist check (fails open)
│
├── frontend/                 # React SPA (Vercel)
│   ├── index.html            # pre-paint theme script (avoids dark/light flash)
│   └── src/
│       ├── main.jsx           # entry; fires cold-start warm-up before mount
│       ├── App.jsx            # routes + ThemeProvider + AuthProvider
│       ├── index.css          # design system + dark-mode layer + hover styles
│       ├── api/               # axios client (cold-start retry) + per-resource APIs
│       ├── context/           # AuthContext, ThemeContext
│       ├── components/        # Layout, Navbar, Sidebar, Modal, Badge, ThemeToggle…
│       └── pages/             # Login, Register, Dashboard, Projects, ProjectDetail,
│                              # SuiteDetail, TestRuns, RunDetail, Users
│
├── automation/               # Test automation frameworks (practice deliverables)
│   ├── selenium-testhub/      # Selenium 4 + TestNG, Page Object Model
│   ├── playwright-testhub/    # Playwright for Java + TestNG, Page Object Model
│   └── restassured-testhub/   # RestAssured + Jackson POJOs, Service Object Model
│
├── postman/                  # Postman smoke-test collection
├── .github/workflows/        # keep-warm.yml (pings /health to fight cold starts)
├── render.yaml               # Render service definitions
└── docs/                     # ← you are here
```

---

## 3. Data model (owned by core-service)

```
User (auth-service DB)
  id, email, name, passwordHash, role(ADMIN|TESTER|VIEWER)

Project 1───* TestSuite 1───* TestCase 1───* TestResult *───1 TestRun
  │                                                              │
  └──────────────────────── 1 ────* TestRun ────────────────────┘

Project(id, name, description, status[ACTIVE|ARCHIVED], createdById)
TestSuite(id, name, description, projectId →Project)               [cascade delete]
TestCase(id, title, steps, expected, priority, status, tags[], suiteId →TestSuite)
TestRun(id, name, status[IN_PROGRESS|COMPLETED|ABORTED],
        selectedCaseIds[], projectId →Project)
TestResult(id, status[PASS|FAIL|SKIP|BLOCKED], comment,
           testCaseId →TestCase, runId →TestRun)  @@unique(runId, testCaseId)
```

- A **run** can be *scoped* to a subset of a project's test cases via
  `selectedCaseIds`. If empty, the run covers all cases in the project's suites.
- A **result** is an upsert keyed by `(runId, testCaseId)` — re-marking a case
  updates the existing result rather than duplicating it.
- Deleting a project cascades to its suites, cases, runs, and results.

---

## 4. End-to-end request flow (a worked example)

**"User logs in, opens a project, creates a run, marks a test PASS."**

1. **Login** — SPA `POST /api/auth/login` → gateway → auth-service. auth-service
   verifies the bcrypt hash, signs an **access token (8h)** and **refresh token
   (30d)**, returns both. The SPA stores them in `localStorage`.
2. **Authenticated calls** — axios attaches `Authorization: Bearer <access>` to
   every request. A request interceptor adds it; a response interceptor handles
   401 by refreshing once, and transparently **retries cold-start failures**.
3. **Open dashboard** — `GET /api/dashboard/stats` → gateway → core-service.
   core-service verifies the JWT *locally* (no auth-service call), runs a handful
   of `count`s plus a `groupBy` for the PASS/FAIL/SKIP/BLOCKED breakdown.
4. **Create a run** — `POST /api/runs/project/:projectId` with `testCaseIds`.
   core-service stores the run scoped to those cases.
5. **Mark a result** — `POST /api/runs/:id/results` with `{testCaseId, status}`.
   core-service upserts the `TestResult`.
6. **Export** — `GET /api/runs/:id/export?format=csv|json` streams a downloadable
   report joining each in-scope case to its recorded result.

---

## 5. Cross-cutting concerns

### Authentication & authorization
- JWT access token (8h) + refresh token (30d), both HMAC-signed.
- `requireRole("ADMIN"|"TESTER")` guards writes; reads need only a valid token.
- Logout optionally blacklists the token in Redis (best-effort, **fails open**).

### Free-tier cold starts (the dominant operational constraint)
Render free services sleep after ~15 min idle and take ~24s+ to wake. Mitigations:
- **Frontend**: `warmup.js` pings all services on load and on tab-refocus;
  `client.js` retries transient 5xx/timeout failures with backoff.
- **CI**: `.github/workflows/keep-warm.yml` pings `/health` on a schedule during
  active hours (kept within the ~750 service-hours/month free budget).
- **Automation**: each framework warms services before the suite + a retry analyzer.

### Rate limiting
Opt-in and **off by default** (`ENABLE_AUTH_RATE_LIMIT=true` to enable). This was
deliberately disabled after a 3-hop proxy chain caused IP-keying to lock every
client into one shared bucket. See `auth-service/src/middleware/rateLimiter.js`.

### Theming (frontend)
Light/dark mode via a `data-theme` attribute on `<html>`, persisted in
`localStorage`, defaulting to the OS preference, set **before first paint** by an
inline script in `index.html`. Dark styles are an *additive* layer in `index.css`
scoped to `[data-theme="dark"]`, so light mode is byte-for-byte unchanged.

---

## 6. Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 3, React Router 7, axios, Recharts |
| Gateway | Node, Express 4, http-proxy-middleware, swagger-ui-express |
| Services | Node, Express 4, Prisma 5, jsonwebtoken, bcryptjs, ioredis |
| Database | PostgreSQL |
| Hosting | Render (backend, free tier), Vercel (frontend) |
| API automation | Java 17, RestAssured 5, Jackson, TestNG |
| UI automation | Java 17, Selenium 4 / Playwright, TestNG, ExtentReports |

---

## 7. Local development

```bash
# Each service: install deps, set env, run
cd auth-service && npm install && npm run dev      # :3001
cd core-service && npm install && npm run dev      # :3002 (prisma db push first)
cd gateway      && npm install && npm run dev      # :3000
cd frontend     && npm install && npm run dev      # :5173

# Frontend talks to the gateway via VITE_API_URL (defaults to http://localhost:3000)
```
See [`docs/components/`](./components) for each service's env vars and routes.
```
```
