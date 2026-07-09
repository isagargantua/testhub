# TestHub — Complete Application Specification for Automation Agents

> **Purpose:** This document gives an automation agent (Selenium, Playwright, Postman/RestAssured) everything it needs to write comprehensive tests against TestHub without prior knowledge of the app.

---

## 1. What Is TestHub?

TestHub is a **QA test management web application** built as a deliberate practice target for UI and API automation testing. It is a real, working application — not a mock — with a live database, JWT authentication, and full CRUD across multiple entities. Its purpose is to give testers a realistic system to automate against.

---

## 2. Live URLs

| Resource | URL |
|---|---|
| Frontend (UI) | `https://mytesthub.vercel.app` |
| API Gateway | `https://testhub-gateway.onrender.com` |
| Swagger / API Docs | `https://testhub-gateway.onrender.com/docs` |

> **Cold start warning:** The backend runs on Render's free tier. After 15 minutes of inactivity, services sleep and take **20–90 seconds** to wake on first request. Always call `GET /health` first and retry until `200` before running a suite.

---

## 3. Tech Stack & Architecture

```
Browser (React SPA)
        │
        ▼
   Vercel CDN
(frontend — static React build)
        │  HTTPS
        ▼
  API Gateway (Node/Express)
  testhub-gateway.onrender.com
        │
   ┌────┴────┐
   ▼         ▼
Auth Service  Core Service
(Node/Express) (Node/Express)
        │
        ▼
  PostgreSQL (Render managed DB)
  ORM: Prisma
```

- **Frontend:** React 19, Vite, TailwindCSS, React Router v6, Axios
- **Gateway:** Express — proxies `/api/auth/*` → Auth Service, everything else → Core Service
- **Auth Service:** Express, JWT (access + refresh tokens), bcrypt
- **Core Service:** Express, Prisma ORM, multer (file uploads), archiver (zip)
- **Database:** PostgreSQL — single DB shared by Auth + Core services

---

## 4. Authentication System

### 4.1 Token Strategy

- **Access token:** Short-lived JWT (~15 min), sent as `Authorization: Bearer <token>` header on every API request
- **Refresh token:** Longer-lived JWT, used to get a new access token
- **Storage:** Both tokens in `localStorage` (`accessToken`, `refreshToken`)
- **Auto-refresh:** The Axios client interceptor catches `401` on any non-auth route and auto-refreshes silently. On refresh failure it clears tokens and redirects to `/login`.
- **Cold-start retry:** The client retries any network error or 5xx up to 8 times with exponential backoff (max 15s per attempt), transparently covering Render cold starts.

### 4.2 Auth Endpoints

#### Register
```
POST /api/auth/register
Content-Type: application/json

{
  "name": "QA Lead",
  "email": "qa@company.com",
  "password": "Test@12345"
}

Response 201:
{
  "user": { "id": "uuid", "name": "...", "email": "...", "role": "TESTER" },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

- First registered user automatically gets role `ADMIN`
- Subsequent users get role `TESTER`
- Password minimum: 6 characters
- Email must be unique — duplicate email returns `409`
- Rate-limited under bursty load → returns `429` — run registrations serially

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "qa@company.com",
  "password": "Test@12345"
}

Response 200:
{
  "user": { "id": "uuid", "name": "...", "email": "...", "role": "ADMIN" },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

- Wrong credentials → `401 { "message": "Invalid credentials" }`

#### Refresh Token
```
POST /api/auth/refresh
Content-Type: application/json

{ "refreshToken": "eyJ..." }

Response 200:
{ "accessToken": "eyJ..." }
```

#### Logout
```
POST /api/auth/logout
Authorization: Bearer <token>

Response 200: { "message": "Logged out" }
```

---

## 5. User Roles

| Role | Description | Access |
|---|---|---|
| `ADMIN` | Full access | All features including Users management + File Storage |
| `TESTER` | Standard user | Projects, Suites, Cases, Runs, Dashboard, Test Cases |

> The **first user to register** on the system becomes `ADMIN`. All subsequent users are `TESTER` by default. There is no promote/demote endpoint.

---

## 6. All API Endpoints

All core endpoints require: `Authorization: Bearer <accessToken>`

### 6.1 Health Check

```
GET /health

Response 200: { "status": "ok" }
```

Call this before starting any test suite and poll until `200` to ensure all services are awake.

---

### 6.2 Dashboard

#### Get Dashboard Stats
```
GET /api/dashboard/stats

Response 200:
{
  "totalProjects": 5,
  "totalTestCases": 120,
  "totalRuns": 23,
  "passRatePercent": 87,
  "recentRuns": [
    { "id": "uuid", "name": "Smoke Run", "status": "PASSED" }
  ],
  "resultBreakdown": {
    "PASS": 102, "FAIL": 8, "SKIP": 6, "BLOCKED": 4
  },
  "latestRunName": "Regression Run v2",
  "latestRunStatus": "FAILED",
  "latestRunResults": [
    { "id": "uuid", "status": "PASS", "testCase": { "title": "Login test", "priority": "HIGH" } }
  ]
}
```

#### Get Results by Status
```
GET /api/dashboard/results?status=FAIL

Response 200: [
  {
    "id": "uuid",
    "status": "FAIL",
    "testCaseTitle": "Checkout flow",
    "runName": "Regression v1",
    "priority": "CRITICAL"
  }
]
```
Valid statuses: `PASS`, `FAIL`, `SKIP`, `BLOCKED`

---

### 6.3 Projects

#### List Projects
```
GET /api/projects?page=1&limit=10&search=keyword

Response 200:
{
  "items": [
    {
      "id": "uuid",
      "name": "E-Commerce App",
      "description": "Tests for the shopping cart",
      "status": "ACTIVE",
      "createdAt": "2026-06-17T10:00:00Z",
      "updatedAt": "2026-06-17T10:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 3, "pages": 1 }
}
```

#### Create Project
```
POST /api/projects
Content-Type: application/json

{
  "name": "My Project",
  "description": "Optional description"
}

Response 201: { project object }
```
- `name` is required
- Duplicate name → `409`

#### Get Single Project
```
GET /api/projects/:projectId

Response 200: { project object with suites array }
```

#### Update Project
```
PUT /api/projects/:projectId
{ "name": "...", "description": "...", "status": "ACTIVE" }

Response 200: { updated project }
```

#### Delete Project
```
DELETE /api/projects/:projectId

Response 200: { "message": "Project deleted" }
```
> **Cascade:** deletes all suites, test cases, runs, and results within the project.

---

### 6.4 Test Suites

#### List Suites for a Project
```
GET /api/projects/:projectId/suites

Response 200: [ { "id": "uuid", "name": "Login Suite", "description": "...", "projectId": "..." } ]
```

#### Create Suite
```
POST /api/projects/:projectId/suites
{ "name": "Checkout Suite", "description": "Optional" }

Response 201: { suite object }
```

#### Get Suite (with test cases)
```
GET /api/suites/:suiteId

Response 200:
{
  "id": "uuid",
  "name": "Login Suite",
  "testCases": [
    { "id": "uuid", "title": "Valid login", "priority": "HIGH", "status": "ACTIVE" }
  ]
}
```

#### Update Suite
```
PUT /api/suites/:suiteId
{ "name": "...", "description": "..." }
```

#### Delete Suite
```
DELETE /api/suites/:suiteId
```

---

### 6.5 Test Cases

Valid priorities: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`

#### List All Test Cases (Global View)
```
GET /api/test-cases?page=1&limit=12&search=login&projectId=uuid&priority=HIGH

Response 200:
{
  "items": [
    {
      "id": "uuid",
      "title": "Valid login with correct credentials",
      "description": "Steps: 1. Open login page...",
      "priority": "HIGH",
      "status": "ACTIVE",
      "suiteId": "uuid",
      "projectId": "uuid",
      "projectName": "E-Commerce App",
      "suiteName": "Login Suite"
    }
  ],
  "pagination": { ... }
}
```

#### Get Test Cases for a Suite
```
GET /api/suites/:suiteId/test-cases

Response 200: [ array of test case objects ]
```

#### Create Test Case
```
POST /api/suites/:suiteId/test-cases
{
  "title": "Valid login",
  "description": "Steps to reproduce...",
  "priority": "HIGH"
}

Response 201: { test case object }
```

#### Update Test Case
```
PUT /api/test-cases/:testCaseId
{ "title": "...", "description": "...", "priority": "MEDIUM", "status": "ACTIVE" }
```

#### Delete Test Case
```
DELETE /api/test-cases/:testCaseId
```

---

### 6.6 Test Runs

Run statuses: `PENDING`, `IN_PROGRESS`, `PASSED`, `FAILED`, `BLOCKED`

#### List Runs for a Project
```
GET /api/projects/:projectId/runs?page=1&limit=10

Response 200:
{
  "items": [
    {
      "id": "uuid",
      "name": "Smoke Run 2026-06-19",
      "status": "IN_PROGRESS",
      "projectId": "uuid",
      "createdAt": "...",
      "testResultCount": 12
    }
  ]
}
```

#### Create Run
```
POST /api/projects/:projectId/runs
{
  "name": "Regression Run v1",
  "suiteId": "uuid",
  "testCaseIds": ["uuid1", "uuid2", "uuid3"]
}

Response 201: { run object }
```
- `suiteId` + `testCaseIds` are required
- Only test cases belonging to that suite can be included

#### Get Run (with results)
```
GET /api/runs/:runId

Response 200:
{
  "id": "uuid",
  "name": "Regression Run v1",
  "status": "IN_PROGRESS",
  "project": { "id": "...", "name": "..." },
  "testResults": [
    {
      "id": "uuid",
      "status": "PENDING",
      "notes": null,
      "testCase": { "id": "uuid", "title": "...", "priority": "HIGH" }
    }
  ]
}
```

#### Delete Run
```
DELETE /api/runs/:runId
```

---

### 6.7 Test Results (Mark Results Within a Run)

Result statuses: `PENDING`, `PASS`, `FAIL`, `SKIP`, `BLOCKED`

#### Update a Single Result
```
PATCH /api/results/:resultId
{
  "status": "PASS",
  "notes": "Passed on Chrome 120"
}

Response 200: { updated result object }
```

> Updating results automatically recalculates and updates the parent run's overall status.

---

### 6.8 Users (ADMIN only)

Non-admin requests to any `/api/auth/users` endpoint → `403`

#### List Users
```
GET /api/auth/users?page=1&limit=12&search=email

Response 200:
{
  "items": [
    {
      "id": "uuid",
      "name": "QA Lead",
      "email": "qa@company.com",
      "role": "ADMIN",
      "createdAt": "..."
    }
  ],
  "pagination": { "page": 1, "limit": 12, "total": 5, "pages": 1 }
}
```

#### Delete User
```
DELETE /api/auth/users/:userId

Response 200: { "message": "User deleted" }
```

#### Reset User Password
```
PATCH /api/auth/users/:userId/password
{ "password": "NewPass@123" }

Response 200: { "message": "Password reset successfully" }
```
- Minimum 6 characters
- Default password used by the UI: `Test@12345`

---

### 6.9 File Storage (ADMIN only)

> Storage is **isolated per admin** — each admin only sees and manages their own files. Non-admin requests → `403`.

#### List Files
```
GET /api/dumps?page=1&limit=100

Response 200:
{
  "items": [
    {
      "id": "uuid",
      "filename": "screenshot.png",
      "mimeType": "image/png",
      "sizeBytes": 204800,
      "kind": "IMAGE",
      "notes": "Failing checkout screenshot",
      "uploadedById": "uuid",
      "createdAt": "..."
    }
  ],
  "usage": {
    "usedBytes": 1048576,
    "limitBytes": 209715200,
    "maxFileBytes": 41943040,
    "maxFiles": 20
  },
  "pagination": { ... }
}
```
File kinds: `TEXT`, `ARCHIVE`, `IMAGE`, `OTHER`

#### Upload Files
```
POST /api/dumps
Content-Type: multipart/form-data

Form fields:
  files: [file1, file2, ...]   (multiple files, field name = "files" — plural)
  notes: "optional label"

Response 201:
{ "items": [ { file metadata objects } ] }
```
- Max per file: **40 MB**
- Max files per request: **20**
- Total storage per admin: **200 MB**
- Exceeding limits → `413`

#### Download Single File
```
GET /api/dumps/:id/download

Response: binary file stream with Content-Disposition attachment header
```

#### Download Multiple as ZIP
```
POST /api/dumps/zip
{ "ids": ["uuid1", "uuid2"] }

Response: application/zip binary stream
Filename pattern: dump-export-YYYY-MM-DD.zip
```
- Only the requesting admin's file IDs are valid in this batch

#### Delete File
```
DELETE /api/dumps/:id

Response 200: { "message": "Item deleted successfully" }
```

---

## 7. Data Models & Relationships

```
User
 ├── has many DumpItems (uploadedById — file storage per admin)
 └── created many Projects/Runs (implicit ownership)

Project
 ├── has many TestSuites
 └── has many TestRuns

TestSuite
 └── has many TestCases

TestRun
 ├── belongs to Project
 ├── references TestSuite
 └── has many TestResults

TestResult
 ├── belongs to TestRun
 └── belongs to TestCase

DumpItem
 └── belongs to User (uploadedById)
```

---

## 8. UI Pages & Flows

### `/login`
- Email + password form
- Animated SVG mascots ("goggle buddies") react to field focus, typing, errors, caps lock, and success
- "Services asleep? Wake them" button — pings the backend health endpoint, shows status
- On success → redirects to `/`
- On fail → mascots animate (head-shake, escalating facepalm on repeated failures), error message shown inline
- Link at bottom: "Don't have an account? Create one" → `/register`

### `/register`
- Name + Email + Password + Confirm Password
- Same mascot animation stage as login
- Mascots look away when a password field is revealed
- Inline mismatch hint: "Passwords don't match yet" (role="status")
- Caps Lock warning shown near active password field
- On success → auto-navigates to `/` (user is signed in)
- Link at bottom: "Already have an account? Sign in" → `/login`

### `/` (Dashboard)
- 4 animated stat cards: Total Projects, Test Cases, Runs, Pass Rate %
- Donut chart (Recharts): result breakdown PASS/FAIL/SKIP/BLOCKED
- Click a chart segment → status filter panel loads below with paginated test case list
- Recent Runs list with status badges
- Latest Run expandable per-case results
- Auto-refreshes every 15 seconds + on tab/window focus

### `/projects`
- Responsive grid of project cards
- Card: name, status badge, description, "Open workspace" link, "Delete" button
- Click card → `/projects/:projectId`
- "Create Project" button → modal (name + description)
- Delete: custom confirm dialog → optimistic remove → success/error toast
- Empty state: sleepy mascot illustration + "No projects yet"

### `/projects/:projectId`
- Project header (name, description, status)
- List of test suites with case counts
- "Create Test Suite" button → modal
- Each suite row: name, case count, "View Suite" + "Delete"

### `/suites/:suiteId`
- Suite header + all test cases
- Test case table: title, priority badge, status
- "Add Test Case" button → modal (title, description, priority dropdown)
- "Edit" / "Delete" per case

### `/projects/:projectId/runs`
- All runs for the project with status badges + result counts
- "Create Run" button → modal: run name, suite selector, test case multi-select
- Click run row → `/runs/:runId`

### `/runs/:runId`
- Per-test-case result marking interface
- Each row: case title, priority, status dropdown (PENDING/PASS/FAIL/SKIP/BLOCKED), notes text input
- Status auto-saves on change
- Run overall status recalculates automatically

### `/test-cases` (Global Library)
- All test cases across all projects, paginated
- Search by keyword, filter by project (dropdown), filter by priority
- Card grid: title, priority badge, project name, suite name
- Empty state: sleepy mascot + "No test cases found"

### `/users` (ADMIN only)
- Table: Name + ID, Email, Role badge, Created At, Actions
- Search form: text input + "Search" button (resets to page 1)
- Per-row actions: "Reset password" → modal (pre-filled `Test@12345`), "Delete" → confirm dialog
- Pagination: "Previous" / "Next" + "N total user(s) across N page(s)" summary
- Skeleton loaders while fetching
- Empty state: sleepy mascot + "No users found"
- Redirect/403 for TESTER role

### `/dump` (File Storage, ADMIN only)
- Per-admin private file vault
- Storage usage progress bar: "X of Y (Z%)"
- Upload area: dashed dropzone → Step 1 (choose files, shows count + size) → Step 2 (notes + Upload button)
- Cancel button appears mid-upload to abort immediately
- Files table: checkbox (batch mode), filename + notes, type badge, size, uploaded datetime, Download + Delete buttons
- "Select & download as ZIP" → batch select mode with "Select all" header checkbox
- "Download N as ZIP" + "Cancel" buttons appear in batch mode
- Individual download: streams file bytes to browser as attachment
- Delete: confirm dialog → success toast
- Empty state: sleepy mascot + "No files yet"

---

## 9. Global UI Elements

### Sidebar

| Item | URL | Visible to |
|---|---|---|
| Dashboard / OVERVIEW | `/` | All |
| Projects / WORKSPACES | `/projects` | All |
| Test Cases / LIBRARY | `/test-cases` | All |
| Users / ADMIN | `/users` | ADMIN only |
| File Storage / STORAGE | `/dump` | ADMIN only |
| API Docs / SWAGGER | external Swagger URL | ADMIN only |

Other sidebar elements:
- "TestHub / Test Management" brand at top
- "Quick Actions" section: "+ New Project" button
- "System Status" section: green "Operational" dot + "Wake services" button
- Collapse toggle (« icon): 260px ↔ 78px (icon-only mode)
- User info card at bottom: avatar letter, name, role badge
- `Ctrl+B` / `⌘+B` keyboard shortcut: toggles sidebar

### Navbar (top bar)
- "QA Workspace" eyebrow
- "Welcome back" h2 + role pill (ADMIN/TESTER)
- Username greeting from JWT
- **⌘K icon button** — opens Command Palette
- Theme toggle (sun/moon) — switches light ↔ dark; persists on reload
- "Help" button — opens help modal
- "Logout" button — clears `localStorage` tokens → redirects to `/login`

### Command Palette (⌘K / Ctrl+K)
- Open: keyboard shortcut or navbar icon click
- Search input placeholder: "Jump to…"
- Items: Dashboard, Projects, Test Cases, (Users + File Storage + API Docs for ADMIN)
- Keyboard: ↑↓ navigate, Enter open, Esc close

### Toast Notifications
- Location: bottom-right corner
- Types: success (green), error (red), info (purple)
- Auto-dismiss: 4 seconds
- × close button present

### Confirm Dialog (custom — NOT window.confirm)
- Triggered by: delete project, delete user, delete file
- Shows: title + message
- Buttons: "Cancel" + danger-styled action button (label varies: "Delete", "Confirm")
- Enter key = confirm, Esc = cancel
- **Automation note:** `window.confirm` is never called — interact with the React modal's confirm button.

---

## 10. data-testid Reference

| Element | data-testid |
|---|---|
| Login email input | `login-email` |
| Login password input | `login-password` |
| Login submit button | `login-submit` |
| Wake services button | `wake-services` |
| Wake status message | `wake-status` |
| Register name input | `register-name` |
| Register email input | `register-email` |
| Register password input | `register-password` |
| Register confirm input | `register-confirm` |
| Register submit button | `register-submit` |

> Other pages do not currently have `data-testid` attributes. Use `role`, `label`, `placeholder`, or visible text selectors for those elements.

---

## 11. Error Response Shape

All API errors return JSON:
```json
{ "message": "Human-readable error" }
```
Or for validation failures:
```json
{
  "message": "Validation failed",
  "errors": [{ "field": "email", "msg": "Email is required" }]
}
```

| Status | Meaning |
|---|---|
| 400 | Bad request / validation failed |
| 401 | Unauthorized (invalid/expired token) |
| 403 | Forbidden (wrong role — TESTER accessing ADMIN route) |
| 404 | Resource not found |
| 409 | Conflict (duplicate email, duplicate project name) |
| 413 | File too large or storage quota exceeded |
| 429 | Rate limited (auth endpoints under bursty load) |
| 500/502/503/504 | Server error — typically transient cold-start on Render free tier |

---

## 12. Known Automation Gotchas

1. **Cold starts:** Backend sleeps after ~15 min idle. Always call `GET /health` and poll until `200` before starting suites. Budget up to 90 seconds.
2. **First registered user = ADMIN:** Control this in your test seed setup. If your suite creates users on a fresh DB, the first one gets ADMIN.
3. **Rate limiting on `/api/auth/register`:** Bursty parallel calls get `429`. Run registration calls serially.
4. **File Storage is per-admin isolated:** Admin1's files are invisible to Admin2. Each admin has their own 200 MB quota.
5. **Token handling:** Store `accessToken` in localStorage key `accessToken`, `refreshToken` in `refreshToken`. The client auto-refreshes on `401`.
6. **Confirm dialogs are custom React modals:** NOT `window.confirm`. Interact with the modal's "Delete" or "Confirm" button in Playwright/Selenium.
7. **Toast notifications:** Success/error feedback is in toast elements (bottom-right), not inline divs. Assert these for action confirmation.
8. **Sidebar toggle:** `Ctrl+B` collapses/expands the sidebar. If elements go off-screen, expand it.
9. **Command palette:** `Ctrl+K` opens it. Close with `Esc`.
10. **Upload field name:** multipart file upload uses field name `"files"` (plural), not `"file"`.
11. **Delete cascades:** Deleting a project removes all suites, cases, runs, and results — not recoverable.
12. **Run status is derived:** Marking all results PASS auto-promotes the run to `PASSED`. Don't hardcode run status expectations before all results are marked.

---

## 13. Recommended Test Coverage

### Auth Flows
- Register: valid, duplicate email, password < 6 chars, mismatch confirm, empty fields
- Login: valid, wrong password, empty fields, 429 on burst
- Logout: tokens cleared, redirect to `/login`
- Token refresh: access token auto-refreshed on 401
- Role enforcement: first user = ADMIN, subsequent = TESTER

### Projects
- Create (valid, empty name, duplicate name)
- List (empty state, pagination)
- Navigate to project detail
- Delete: confirm path, cancel path, cascade verification

### Test Suites
- Create, list, view, delete
- Cascade delete with parent project

### Test Cases
- Create (all priorities), edit, delete
- Global search by keyword
- Filter by project, filter by priority
- Empty state display

### Test Runs
- Create (pick suite + select test cases)
- Mark results: PASS, FAIL, SKIP, BLOCKED
- Run status auto-update after all results marked
- Dashboard stats reflect new run

### Dashboard
- Stat card counts match API data
- Donut chart renders with correct segments
- Click segment → status filter panel appears with correct cases
- Latest run expandable

### Users (ADMIN)
- List all users, search by name, search by email
- Pagination (previous/next, count text)
- Reset password (modal, default value, submit)
- Delete user (confirm, success toast)
- TESTER cannot access `/users` (403 or redirect)

### File Storage (ADMIN)
- Upload single file, upload multiple files
- Upload file near 40 MB limit (should succeed)
- Upload file > 40 MB (expect 413)
- Cancel upload mid-progress
- Download single file (verify filename)
- Batch select + ZIP download
- Delete file (confirm dialog, success toast)
- TESTER cannot access `/dump` (403 or redirect)
- Admin1's files invisible to Admin2

### UI / Global
- Theme toggle (light → dark, persists on reload)
- Command palette: open, search, navigate, close with Esc
- Sidebar collapse/expand (Ctrl+B)
- Toast: success (green), error (red), auto-dismiss
- Confirm dialog: Enter confirms, Esc cancels

---

## 14. Suggested Automation Execution Order

```
1.  GET /health — wait for 200 (cold-start safety gate)
2.  POST /api/auth/register — create admin user, store tokens
3.  POST /api/auth/register — create tester user, store tokens
4.  [As admin] POST /api/projects — create project
5.  [As admin] POST /api/projects/:id/suites — create suite
6.  [As admin] POST /api/suites/:id/test-cases × N — create test cases
7.  [As admin] POST /api/projects/:id/runs — create run with test case IDs
8.  [As admin] PATCH /api/results/:id × N — mark results
9.  [As admin] GET /api/dashboard/stats — assert counts updated
10. [As admin] POST /api/dumps + file — upload to File Storage
11. [As admin] GET /api/dumps/:id/download — verify download
12. [As admin] DELETE /api/dumps/:id — cleanup file
13. [As tester] GET /api/auth/users — expect 403
14. [As tester] GET /api/dumps — expect 403
15. [As admin] DELETE /api/runs/:id — cleanup run
16. [As admin] DELETE /api/projects/:id — cascade cleanup
17. [As admin] DELETE /api/auth/users/:id × 2 — delete both test users
```
