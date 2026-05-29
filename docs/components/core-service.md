# Component: core-service

**Path:** `core-service/` · **Runtime:** Node + Express 4 + Prisma · **Port:** 3002

Owns the test-management domain: projects, suites, test cases, runs, results, and
dashboard aggregates. Verifies JWTs locally; never calls auth-service.

## Endpoints
### Projects (`/api/projects`)
| Method & path | Auth | Purpose |
|---|---|---|
| `GET /` | Bearer | Paginated list (`?page`,`?limit`, clamped safely). |
| `POST /` | TESTER+ | Create project. |
| `GET /:id` | Bearer | Fetch one (404 if missing). |
| `PUT /:id` | TESTER+ | Update name/description/status (404 if missing). |
| `DELETE /:id` | TESTER+ | Delete (cascades; 404 if missing). |

### Suites (`/api/suites`)
`GET /project/:projectId`, `POST /project/:projectId`, `PUT /:id`, `DELETE /:id`.

### Test cases (`/api/testcases`)
`GET /suite/:suiteId` (paginated), `POST /suite/:suiteId`, `PUT /:id`, `DELETE /:id`.

### Runs (`/api/runs`)
| Method & path | Purpose |
|---|---|
| `GET /project/:projectId` | List runs in a project. |
| `POST /project/:projectId` | Create run; optional `testCaseIds` scopes it. |
| `GET /:id` | Run + computed results (PENDING for unmarked) + status summary. |
| `PUT /:id` | Update run (e.g. set status COMPLETED). |
| `POST /:id/results` | Upsert a result for a case `(runId,testCaseId)` unique. |
| `DELETE /:id` | Delete a run. |
| `GET /:id/export?format=csv\|json` | Downloadable report of in-scope cases. |

### Dashboard (`/api/dashboard`)
`GET /stats` — counts (projects/cases/runs/active), pass rate, recent runs,
result breakdown (computed via `groupBy`, not by loading every row), and the
latest run's per-case results.

## Key files
| File | What it does |
|---|---|
| `src/routes/*.js` | One file per resource area (see tables above). |
| `src/middleware/auth.js` | Independent JWT verification with `JWT_ACCESS_SECRET`; `requireRole`. |
| `src/utils/prisma.js` | Shared `PrismaClient` singleton (one pool per process). |
| `src/utils/http.js` | `parsePagination()` (clamps bad `?page`/`?limit`); `isNotFoundError()` maps Prisma `P2025` → 404. |
| `src/utils/redis.js` | Optional blacklist check (fails open). |
| `prisma/schema.prisma` | Project, TestSuite, TestCase, TestRun, TestResult + enums. |

## Env vars
`DATABASE_URL`, `JWT_ACCESS_SECRET` (must match auth-service), `REDIS_URL`
(optional), `PORT` (default 3002). Build runs `prisma generate`; deploy runs
`prisma db push`.

## Performance notes
- Dashboard status breakdown uses `prisma.testResult.groupBy` so it scales with
  the number of statuses (4), not the row count.
- All route files import the **one** shared Prisma singleton — previously each
  file created its own client, opening ~5 connection pools and exhausting
  free-tier Postgres connections during cold-start reconnects.

## Gotchas
- Writes require role ADMIN or TESTER; there is currently no per-record ownership
  check (any TESTER can edit any project) — acceptable for a single-user practice
  target, noted here for anyone hardening it.
