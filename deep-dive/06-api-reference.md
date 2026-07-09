# 6. API Reference

> These are the **actual paths and shapes as implemented in the route files**
> (`auth-service/src/routes/auth.js`, `core-service/src/routes/*.js`). All traffic
> goes through the gateway, which forwards the original path unchanged. The live
> Swagger UI is at `https://testhub-gateway.onrender.com/docs`.

**Base URL:** the gateway (`VITE_API_URL`, e.g. `https://testhub-gateway.onrender.com`).
**Auth header:** `Authorization: Bearer <accessToken>` on every endpoint except
register/login/refresh and `/health`.

**Error envelope:** `{ "message": "..." }`, or for validation failures
`{ "errors": [ { "msg": "...", "param": "...", ... } ] }` (express-validator's
array). Status codes: `400` validation/bad input, `401` missing/invalid token,
`403` wrong role, `404` not found / not yours, `413` upload too large / quota,
`500` unexpected. (`429` only if rate limiting is explicitly enabled.)

---

## 6.1 Health

```
GET /health          → 200 { "status": "ok" }
```
Exposed by the gateway and by each service directly. Poll until 200 before running
a suite — free-tier cold start is ~24–90s.

---

## 6.2 Auth  (`/api/auth/*`, auth-service)

### Register
```
POST /api/auth/register
{ "name": "QA Lead", "email": "qa@x.com", "password": "secret1" }

201 → { "user": {id,name,email,role}, "accessToken", "refreshToken" }
```
- `password` min 6. Email is normalized/lowercased.
- **First user ever → role `ADMIN`; all later users → `TESTER`.**
- Duplicate email → **400** `{message:"User already exists"}` (note: not 409).

### Login
```
POST /api/auth/login
{ "email": "qa@x.com", "password": "secret1" }

200 → { "user": {id,name,email,role}, "accessToken", "refreshToken" }
```
- Wrong email or password → **401** `{message:"Invalid credentials"}`.

### Current user
```
GET /api/auth/me            (Bearer)
200 → { id, name, email, role }
```

### Refresh
```
POST /api/auth/refresh
{ "refreshToken": "..." }
200 → { "accessToken": "..." }
```

### Logout
```
POST /api/auth/logout       (Bearer)
200 → { "message": "Logged out successfully" }
```
Best-effort token blacklist if Redis is configured; succeeds regardless.

### Users — ADMIN only
```
GET    /api/auth/users?page=1&limit=12&search=         (ADMIN)
       200 → { items:[{id,name,email,role,createdAt,updatedAt}], pagination:{page,limit,total,pages} }
       (search matches name OR email, case-insensitive; limit clamped 1–100)

PATCH  /api/auth/users/:id/reset-password             (ADMIN)
       { "password": "newsecret" }   (min 6)
       200 → { message, user }

DELETE /api/auth/users/:id                            (ADMIN)
       200 → { message: "User deleted successfully" }
       400 if deleting yourself, or the last remaining ADMIN
```

> Token lifetimes: **access 8h**, **refresh 30d** (overridable via
> `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN`).

---

## 6.3 Projects  (`/api/projects/*`, core-service)

All require a valid token; everything is **scoped to the caller** (you only see
your own projects; others' IDs return 404).

```
GET    /api/projects?page=1&limit=10
       200 → { items:[Project], pagination:{page,limit,total,pages} }

POST   /api/projects                       (ADMIN|TESTER)
       { "name": "My Project", "description": "optional" }
       201 → Project    (name required → 400 if missing)

GET    /api/projects/:id                   → 200 Project | 404
PUT    /api/projects/:id                   (ADMIN|TESTER)
       { name?, description?, status? }     → 200 Project | 404
DELETE /api/projects/:id                   (ADMIN|TESTER)
       200 → { message } | 404   (cascades to suites/cases/runs/results)
```
`Project = { id, name, description, status(ACTIVE|ARCHIVED), createdById, createdAt, updatedAt }`

---

## 6.4 Suites  (`/api/suites/*`, core-service)

```
GET    /api/suites/project/:projectId      → 200 [TestSuite] | 404 (if not your project)
POST   /api/suites/project/:projectId      (ADMIN|TESTER)
       { "name": "Login Suite", "description": "optional" }   → 201 TestSuite
PUT    /api/suites/:id                      (ADMIN|TESTER) { name?, description? } → 200 | 404
DELETE /api/suites/:id                      (ADMIN|TESTER) → 200 { message } | 404
```
`TestSuite = { id, name, description, projectId, createdAt, updatedAt }`

---

## 6.5 Test Cases  (`/api/testcases/*`, core-service)

```
GET /api/testcases/all?page=1&limit=20&search=&projectId=
    200 → { items:[ {
              id, title, description, priority, tags, createdAt,
              project:{id,name}, suite:{id,name},
              runs:[{runId,runName,runStatus,resultStatus,executedAt}],
              latestResult:{status,runName}|null
            } ], pagination }
    (global library of cases you own; search = title contains, case-insensitive)

GET /api/testcases/export?format=csv|json&search=&projectId=
    200 → file download (Content-Disposition attachment). Full authoring detail:
          id,title,description,steps,expected,priority,status,tags,project,suite,
          latestResult,createdAt

GET /api/testcases/suite/:suiteId?page=1&limit=10
    200 → { items:[TestCase], pagination } | 404 (if not your suite)

POST /api/testcases/suite/:suiteId          (ADMIN|TESTER)
     { "title": "...", description?, steps?, expected?, priority?(default MEDIUM), tags?[] }
     201 → TestCase    (title required → 400)

PUT    /api/testcases/:id                    (ADMIN|TESTER)
       { title?, description?, steps?, expected?, priority?, status?, tags? } → 200 | 404
DELETE /api/testcases/:id                    (ADMIN|TESTER) → 200 { message } | 404
```
`priority ∈ {LOW,MEDIUM,HIGH,CRITICAL}`, `status ∈ {ACTIVE,DEPRECATED}`.

---

## 6.6 Runs & Results  (`/api/runs/*`, core-service)

```
GET  /api/runs/project/:projectId           → 200 [TestRun] | 404

POST /api/runs/project/:projectId           (ADMIN|TESTER)
     { "name": "...", description?, "testCaseIds": ["id1","id2"] }
     201 → TestRun   (name required; testCaseIds stored as selectedCaseIds = the run's scope)

GET  /api/runs/:id
     200 → {
       ...TestRun,
       results: [ { id, status, testCaseId, testCase, comment? } ],   // PENDING synthesized for unmarked
       summary: { PASS, FAIL, SKIP, BLOCKED }
     } | 404

POST /api/runs/:id/results                   (ADMIN|TESTER)
     { "testCaseId": "...", "status": "PASS|FAIL|SKIP|BLOCKED", "comment": "optional" }
     200 → TestResult     (UPSERT on (runId,testCaseId): re-marking updates, never duplicates)

PUT    /api/runs/:id                         (ADMIN|TESTER)
       { name?, description?, status?, selectedCaseIds? }   → 200 TestRun | 404
       (passing selectedCaseIds is how the UI "adds cases" to an existing run)

DELETE /api/runs/:id                         (ADMIN|TESTER)  → 200 { message } | 404

GET    /api/runs/:id/export?format=csv|json  → file download (in-scope cases joined to results)
```
`TestRun = { id, name, description, status(IN_PROGRESS|COMPLETED|ABORTED), selectedCaseIds[], projectId, createdById, createdAt, updatedAt }`
`status` on a result ∈ {PASS,FAIL,SKIP,BLOCKED}. **PENDING is API-synthesized, never stored.**

---

## 6.7 Dashboard  (`/api/dashboard/*`, core-service)

```
GET /api/dashboard/stats
    200 → {
      totalProjects, activeProjects, totalTestCases, totalRuns, activeRuns,
      passRatePercent,
      recentRuns: [ {id,name,status,...} ],            // latest 5
      resultBreakdown: { PASS, FAIL, SKIP, BLOCKED },  // deduped: latest result per case
      latestRunName, latestRunStatus,
      latestRunResults: [ { id, status, testCase:{title,priority} } ]
    }

GET /api/dashboard/results?status=PASS|FAIL|SKIP|BLOCKED
    200 → [ { id, status, comment, executedAt, testCaseTitle, priority, runName } ]
    (deduped to latest result per case; invalid status → 400)
```
All metrics are scoped to the caller's projects. `passRatePercent` = round(PASS /
total-executed × 100).

---

## 6.8 File Storage / Dumps  (`/api/dumps/*`, core-service — ADMIN only)

Every endpoint is **ADMIN-gated** and scoped to `uploadedById = you`
(per-admin isolation).

```
GET  /api/dumps?page=1&limit=100
     200 → {
       items: [ {id,filename,mimeType,sizeBytes,kind,notes,uploadedById,createdAt} ],
       usage: { usedBytes, limitBytes, maxFileBytes, maxFiles },
       pagination
     }

POST /api/dumps                              (multipart/form-data)
     field "files" (one or more), optional field "notes"
     201 → { items:[ <metadata> ] }
     413 if a file exceeds DUMP_MAX_FILE_MB (40), if more than DUMP_MAX_FILES (20),
         or if the per-admin total (DUMP_TOTAL_LIMIT_MB, 200) would be exceeded
     400 if no files provided

POST /api/dumps/zip
     { "ids": ["id1","id2"] }
     200 → application/zip stream (filename dump-export-<ts>.zip)
     413 if the selection exceeds DUMP_ZIP_MAX_MB (100); 404 if none of the ids are yours

GET    /api/dumps/:id/download   → 200 file bytes (Content-Disposition attachment) | 404
DELETE /api/dumps/:id            → 200 { message } | 404 (missing or not yours)
```
`kind ∈ {IMAGE, ARCHIVE, TEXT, OTHER}` (derived from mime/extension at upload).

---

## 6.9 Status-code cheat sheet

| Code | When |
|---|---|
| 200 | OK (read, update, delete, action) |
| 201 | Created (register, project/suite/case/run/dump create) |
| 400 | Validation failed; duplicate email; deleting self/last-admin; invalid dashboard status; empty upload |
| 401 | No/!invalid token; wrong login credentials |
| 403 | Authenticated but wrong role (e.g. TESTER hitting an ADMIN route) |
| 404 | Resource missing **or not owned by you** |
| 413 | Upload file too big / too many files / storage quota / zip too big |
| 429 | Rate limited — only if `ENABLE_AUTH_RATE_LIMIT=true` (off by default) |
| 500 | Unexpected server error (often a transient cold start on free tier) |

Next: [07-auth-security-infra.md](./07-auth-security-infra.md).
