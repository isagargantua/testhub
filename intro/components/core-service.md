# Component: core-service

**Path:** `core-service/` · **Runtime:** Node + Express 4 + Prisma · **Port:** 3002

Owns the test-management domain: projects, suites, test cases, runs, results,
file storage (dumps), and dashboard aggregates. Verifies JWTs locally using the
shared `JWT_ACCESS_SECRET`; never calls auth-service at runtime.

---

## Endpoints

### Projects (`/api/projects`)

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /` | Bearer | Paginated list (`?page`, `?limit`, `?search`). |
| `POST /` | TESTER+ | Create project (`{name, description}`). |
| `GET /:id` | Bearer | Fetch one project (404 if missing). |
| `PUT /:id` | TESTER+ | Update name/description/status (404 if missing). |
| `DELETE /:id` | TESTER+ | Delete; cascades to suites, cases, runs, results. |

---

### Suites (`/api/suites`)

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /project/:projectId` | Bearer | List suites for a project. |
| `POST /project/:projectId` | TESTER+ | Create suite (`{name, description}`). |
| `GET /:id` | Bearer | Fetch one suite with its test cases. |
| `PUT /:id` | TESTER+ | Update suite. |
| `DELETE /:id` | TESTER+ | Delete suite (cascades to cases). |

---

### Test Cases (`/api/testcases`)

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /all` | Bearer | **Global paginated view** of all test cases the current user owns. Query params: `?page`, `?limit`, `?search` (title keyword), `?projectId`. Uses a two-step query (projects → suite IDs → cases) for flat Prisma compatibility. |
| `GET /export` | Bearer | Download all matching cases as CSV or JSON. Query params: `?format=csv\|json`, `?search`, `?projectId`. Responds with a `Content-Disposition: attachment` header. |
| `GET /suite/:suiteId` | Bearer | Paginated cases for one suite. |
| `POST /suite/:suiteId` | TESTER+ | Create test case (`{title, description, priority}`). |
| `PUT /:id` | TESTER+ | Update case fields. |
| `DELETE /:id` | TESTER+ | Delete case. |

Valid priorities: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`

---

### Runs (`/api/runs`)

| Method & path | Purpose |
|---|---|
| `GET /project/:projectId` | List runs in a project. |
| `POST /project/:projectId` | Create run; `testCaseIds[]` scopes it to specific cases. |
| `GET /:id` | Run detail + computed results (PENDING for unmarked) + status summary. |
| `PUT /:id` | Update run (e.g. set status `COMPLETED`). |
| `POST /:id/results` | Upsert a result for `{testCaseId, status, comment}`. `(runId, testCaseId)` unique — re-marking updates, never duplicates. |
| `DELETE /:id` | Delete a run. |
| `GET /:id/export?format=csv\|json` | Downloadable report joining in-scope cases to their results. |

Run statuses: `IN_PROGRESS`, `COMPLETED`, `ABORTED`
Result statuses: `PENDING`, `PASS`, `FAIL`, `SKIP`, `BLOCKED`

---

### Dashboard (`/api/dashboard`)

| Method & path | Returns |
|---|---|
| `GET /stats` | `{totalProjects, totalTestCases, totalRuns, passRatePercent, recentRuns, resultBreakdown, latestRunName, latestRunStatus, latestRunResults}`. Breakdown uses `groupBy` — scales with status count (4), not row count. |
| `GET /results?status=PASS` | Flat array of `{testCaseTitle, runName, status, priority}` for all results matching the given status. Used by the dashboard donut segment filter. |

---

### File Storage — Dumps (`/api/dumps`) — ADMIN only

Every endpoint requires `ADMIN` role. Per-admin isolation is enforced at the
query level (`uploadedById = req.user.id`). Files are stored as raw bytes
(`bytea`) in Postgres. Multer buffers uploads in memory before writing.

| Method & path | Purpose |
|---|---|
| `GET /` | Paginated list of own files + usage stats (`usedBytes`, `limitBytes`, `maxFileBytes`, `maxFiles`). |
| `POST /` | Multipart upload. Field name: `files` (plural, multiple). Optional field: `notes`. Enforces per-file cap (default 40 MB), per-request file count (default 20), and total storage cap (default 200 MB). Exceeding limits → `413`. |
| `POST /zip` | Batch download as ZIP. Body: `{ids:[]}`. Streams a `dump-export-YYYY-MM-DD.zip`. Only the requesting admin's IDs are valid. |
| `GET /:id/download` | Streams the file bytes with `Content-Disposition: attachment`. |
| `DELETE /:id` | Deletes own file only (foreign-key check enforces ownership). |

File kind classification (server-side):
- `IMAGE` — MIME starts with `image/`
- `ARCHIVE` — zip, gz, tar, rar, 7z extensions
- `TEXT` — text/\*, JSON, CSV, YAML, Markdown, XML
- `OTHER` — everything else

Configurable via env vars:
- `DUMP_MAX_FILE_MB` (default 40)
- `DUMP_TOTAL_LIMIT_MB` (default 200)
- `DUMP_MAX_FILES` (default 20)

---

## Key files

| File | What it does |
|---|---|
| `src/routes/projects.js` | Project CRUD. |
| `src/routes/suites.js` | Suite CRUD. |
| `src/routes/testcases.js` | Test case CRUD + `/all` global view + `/export`. |
| `src/routes/runs.js` | Run CRUD + result upsert + CSV/JSON export. |
| `src/routes/dashboard.js` | Aggregate stats + status filter results. |
| `src/routes/dumps.js` | File storage vault (multer upload, archiver ZIP, bytea stream). |
| `src/middleware/auth.js` | Independent JWT verification with `JWT_ACCESS_SECRET`; `requireRole`. |
| `src/utils/prisma.js` | Shared `PrismaClient` singleton — one pool per process. |
| `src/utils/http.js` | `parsePagination()` clamps bad `?page`/`?limit`; `isNotFoundError()` maps Prisma `P2025` → 404. |
| `src/utils/redis.js` | Optional blacklist check (fails open if Redis unavailable). |
| `src/utils/ownership.js` | `ownedSuite()`, `ownedTestCase()` — verify the requesting user owns the parent resource. |
| `prisma/schema.prisma` | Project, TestSuite, TestCase, TestRun, TestResult, DumpItem + enums. |

---

## Env vars

| Var | Notes |
|---|---|
| `DATABASE_URL` | Postgres connection string (required). |
| `JWT_ACCESS_SECRET` | Must match auth-service (required). |
| `REDIS_URL` | Optional; if absent, blacklist checks fail open. |
| `PORT` | Defaults to 3002. |
| `DUMP_MAX_FILE_MB` | Per-file upload cap (default 40). |
| `DUMP_TOTAL_LIMIT_MB` | Per-admin total storage cap (default 200). |
| `DUMP_MAX_FILES` | Max files per upload request (default 20). |

Build step runs `prisma generate`; deploy step runs `prisma db push`.

---

## Performance notes

- Dashboard `resultBreakdown` uses `prisma.testResult.groupBy` so it scales with
  the number of statuses (4), not the result row count.
- All route files share the single Prisma singleton — previously each file created
  its own client, opening ~5 connection pools and exhausting free-tier Postgres
  connections during cold-start reconnects.
- Dump uploads buffer in memory (multer `memoryStorage`) before writing to Postgres
  `bytea`. This keeps the code simple but means large files (near the 40 MB cap)
  spike memory. Render's free tier has ~512 MB RAM; keep the cap modest.

---

## Gotchas

- Writes require ADMIN or TESTER role; there is currently **no per-record ownership
  check** for projects/suites/cases/runs — any TESTER can edit any project.
  Acceptable for a single-workspace practice target; noted here for hardening.
- Dump endpoints **do** enforce per-admin ownership at the query level.
- `POST /:runId/results` is an **upsert** — re-submitting a result for the same
  `(runId, testCaseId)` updates the existing row, never creates a duplicate.
- Prisma `P2025` ("record not found") is mapped to `404` by `isNotFoundError()` on
  update/delete routes — don't expect a `500` for missing-resource mutations.
