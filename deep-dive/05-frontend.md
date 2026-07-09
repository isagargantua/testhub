# 5. Frontend Deep Dive

A React 19 + Vite single-page app, styled with Tailwind + a custom design-token
layer, deployed to Vercel. It talks **only to the gateway** via `VITE_API_URL`.

---

## 5.1 Boot sequence

1. **`index.html`** runs a tiny inline script *before paint* that reads
   `localStorage.theme` (or the OS `prefers-color-scheme`) and sets
   `data-theme="light|dark"` on `<html>` — this prevents a flash of the wrong
   theme. Then it loads `/src/main.jsx`.
2. **`src/main.jsx`** calls `warmupServices()` *before React mounts* (fire each
   service's `/health` so cold containers start waking immediately), then renders
   `<App/>` inside `<StrictMode>`.
3. **`src/App.jsx`** wires the **provider stack** and the **router**:
   ```
   <BrowserRouter>
     <ThemeProvider>          // data-theme + toggle
       <AuthProvider>         // user, login/register/logout, loads /me on boot
         <ToastProvider>      // bottom-right notifications
           <ConfirmProvider>  // promise-based confirm modal
             <TitleSync/>     // keeps document.title = "TestHub"
             <Routes> … </Routes>
   ```

### Route table (`App.jsx`)
| Path | Element | Guard |
|---|---|---|
| `/login` | `Login` | public |
| `/register` | `Register` | public |
| `/` | `Layout` (shell) | `ProtectedRoute` (must be logged in) |
| `/` (index) | `Dashboard` | inherits |
| `/projects` | `Projects` | inherits |
| `/projects/:projectId` | `ProjectDetail` | inherits |
| `/suites/:suiteId` | `SuiteDetail` | inherits |
| `/projects/:projectId/runs` | `TestRuns` | inherits |
| `/runs/:runId` | `RunDetail` | inherits |
| `/test-cases` | `AllTestCases` | inherits |
| `/users` | `Users` | `ProtectedRoute roles={["ADMIN"]}` |
| `/dump` | `Dump` | `ProtectedRoute roles={["ADMIN"]}` |

`vercel.json` rewrites **all** paths to `/index.html` so client-side routing works
on hard refresh / deep links.

---

## 5.2 State & contexts

### `context/AuthContext.jsx`
Holds `user` and `loading`. On mount, if an access token exists it calls
`getMe()`; on failure it clears tokens and treats the user as logged out.
Exposes:
- `login(email, password)` → calls the API, stores both tokens, sets `user`.
- `register(name, email, password)` → same, user is logged in immediately.
- `logout()` → clears tokens & `user` *locally first* (so the UI updates instantly),
  then best-effort calls the logout endpoint; a network failure is swallowed.

`useAuth()` is the accessor hook.

### `context/ThemeContext.jsx`
`theme` (`"light"|"dark"`), `toggleTheme()`, `isDark`. Initial value mirrors the
pre-paint script (saved choice wins, else OS preference). An effect writes
`data-theme` to `<html>` and persists to `localStorage` on every change.
`useTheme()` is the accessor.

---

## 5.3 The API layer (`src/api/`)

Every backend call goes through **`client.js`** so they all share auth, retry, and
refresh behavior.

### `client.js` (the important one)
An axios instance with `baseURL = VITE_API_URL` (default `http://localhost:3000`)
and a **60s per-request timeout** (covers a stacked cold start).
- **Request interceptor:** attaches `Authorization: Bearer <accessToken>` if a
  token exists.
- **Response interceptor**, in order:
  1. **User-cancelled requests** (AbortController) are re-thrown as-is — never
     retried (matters for cancelable uploads).
  2. **Cold-start retry:** if the error is a network error, a timeout, or **any
     5xx**, retry up to **8 times** with backoff (`min(5000*attempt, 15000)`ms,
     ~95s budget). This makes "service was asleep" degrade into "waited a moment,
     then worked."
  3. **401 → refresh once:** for non-auth routes, use the stored refresh token to
     get a new access token (deduplicated so concurrent 401s share one refresh),
     persist it, and replay the original request. If refresh fails, clear tokens
     and `window.location.href = "/login"`.

### `tokenStorage.js`
`getAccessToken` / `getRefreshToken` / `setTokens({accessToken,refreshToken})` /
`clearTokens` — thin wrappers over `localStorage` keys `accessToken` &
`refreshToken`.

### `warmup.js`
- `warmupServices()` — fire-and-forget GET to **each service's own `/health`**
  (gateway/auth/core, derived from the gateway URL by swapping the service name,
  overridable via `VITE_AUTH_URL`/`VITE_CORE_URL`). Hitting services directly
  (not via the proxy) wakes each container reliably.
- `probeServices({timeoutMs})` — awaitable; returns `{gatewayAwake, authAwake,
  coreAwake, allAwake}`. A service counts as awake only on a strict 2xx.
- `wakeServices()` — `probeServices` with a long 80s timeout, used by the "Wake
  services" buttons.
- On import, registers `focus`/`visibilitychange` listeners that **re-warm on tab
  refocus**, throttled to once per 10 min.

### Resource modules (thin wrappers, one per area)
| Module | Functions |
|---|---|
| `auth.js` | `login`, `register`, `getMe`, `logout` |
| `projects.js` | `getProjects`, `createProject`, `updateProject`, `deleteProject` |
| `suites.js` | `getSuites`, `createSuite`, `deleteSuite` |
| `testcases.js` | `getAllTestCases`, `getTestCases`, `createTestCase`, `deleteTestCase`, `exportTestCases` (downloads a blob, reads the filename from `Content-Disposition`) |
| `runs.js` | `getRuns`, `createRun`, `getRun`, `updateRun`, `updateResult`, `deleteRun`, `addTestCasesToRun` (PUT with merged `selectedCaseIds`) |
| `dashboard.js` | `getDashboardStats`, `getResultsByStatus(status)` |
| `users.js` | `getUsers`, `resetUserPassword(id, password)`, `deleteUser` |
| `dumps.js` | `getDumps`, `uploadDumps(files, notes, onProgress, signal)` (multipart, progress %, AbortSignal-cancelable), `downloadDump`, `downloadDumpsZip`, `deleteDump` |

---

## 5.4 Pages (`src/pages/`)

### `Login.jsx` (+ `Login.css`)
Email + password form. Renders `MascotStage` — animated SVG "goggle-buddy"
characters that track the cursor, react to which field is focused, look away when
a password is revealed, shake on failed login, and celebrate on success. A "Wake
services" button calls `wakeServices()` and reports per-service status. On success
navigates to `/`. Has explicit **`data-testid`**s: `login-email`, `login-password`,
`login-submit`, `wake-services`, `wake-status`.

### `Register.jsx`
Name / Email / Password / Confirm. Reuses `Login.css` + `MascotStage`. Client-side
validation: name required, valid email, password ≥ 6, passwords must match (the
mascots look worried on mismatch). Eye-toggles reveal each password field. On
success the user is logged in and routed to `/`. **`data-testid`**s:
`register-name`, `register-email`, `register-password`, `register-confirm`,
`register-submit`, plus `wake-services`/`wake-status`.

### `Dashboard.jsx`
The command center. Loads `getDashboardStats()` on mount, then **auto-refreshes
every 15s** and on tab focus (silent refresh). Shows:
- **4 stat cards** (`StatsCard` + `CountUp`): Projects, Test Cases, Runs, Pass
  Rate % (with a sparkline).
- A **donut chart** (Recharts) of the PASS/FAIL/SKIP/BLOCKED breakdown, with a
  custom tooltip and a clickable legend (count + %).
- **Clicking a status** calls `getResultsByStatus()` and opens a paginated panel
  ("{STATUS} test cases", 10/page) listing every case marked that status.
- **Recent Runs** list with a manual Refresh button.
- **Latest Run** collapsible panel showing per-case results.
- A "How results reach this dashboard" workflow guide (shown inline when there are
  no results yet, collapsible otherwise).
Colors for each result status are defined once in `RESULT_COLORS` (light + dark
text variants).

### `Projects.jsx`
Responsive card grid of the user's projects. Auto-refreshes every 15s + on focus.
- **Create**: a `Modal` with name + description → `createProject`, optimistically
  prepends the new card, shows a success **toast**.
- **Delete**: uses `useConfirm()` (custom modal, not `window.confirm`), then
  **optimistically removes** the card and calls `deleteProject`; on error it
  restores the card and shows an error toast.
- Clicking a card navigates to `/projects/:id`. Empty state via `EmptyState`.

### `ProjectDetail.jsx`
Lists the project's **suites** (client-paginated, 6/page). Header buttons: "View
Runs" (→ `/projects/:id/runs`) and "Create Suite" (modal: name + description).
Each suite card → `/suites/:id`; delete suite inline. Inline success/error banners.

### `SuiteDetail.jsx`
Lists the suite's **test cases** (server-paginated). "Create Test Case" opens a
`Modal` with the **full authoring form**: title (required), description, steps,
expected result, and a priority dropdown (LOW/MEDIUM/HIGH/CRITICAL). Each case
card shows priority badge, title, description, and (in soft cards) steps + expected
result. Delete inline.

### `TestRuns.jsx`
Runs for a project (client-paginated, 6/page). **2-step create wizard** in a modal:
- Step 1: run name (required) + description.
- Step 2: loads every suite's cases, lets you check individual cases or "Select
  all" per suite, shows an "N of M selected" counter, then `createRun` with
  `testCaseIds`.
Each run card has an inline **status dropdown** (IN_PROGRESS/COMPLETED/ABORTED →
`updateRun`), navigates to `/runs/:id`, and has a delete button. Card-click vs.
control-click is handled with `stopPropagation`.

### `RunDetail.jsx`
The execution screen. Loads `getRun(runId)` which returns each in-scope case with
its result (or synthetic `PENDING`) plus a `summary`. Shows:
- **5 summary cards** (PASS/FAIL/SKIP/BLOCKED + PENDING) and a stacked **progress
  bar** with a legend.
- A run-status selector (IN_PROGRESS/COMPLETED/ABORTED).
- For each case, four pill buttons (PASS/FAIL/SKIP/BLOCKED); clicking one calls
  `updateResult(runId, {testCaseId, status})` and reloads — the active status is
  highlighted.
- **"+ Add Test Cases"** modal: pulls all suites' cases, filters out those already
  in the run, lets you multi-select, and `addTestCasesToRun` merges them into the
  run's `selectedCaseIds`.

### `AllTestCases.jsx`
Global library of **every case you own** across projects. Search box (debounced
350ms), project filter dropdown, and **Export CSV / Export JSON** buttons (export
the *current filtered view*, not just the page). Each card shows priority chip,
title, description, a Project › Suite breadcrumb (both clickable), tags, and the
case's run history with result chips (each row → `/runs/:runId`). Server-paginated
(20/page) via the `Pagination` component. Empty state when nothing matches.

### `Users.jsx` (ADMIN)
Paginated, searchable user table (Name+ID, Email, Role badge, Created, Actions),
12/page. **Reset password** opens a `Modal` pre-filled with `Test@12345` →
`resetUserPassword`. **Delete** uses `useConfirm` → `deleteUser` (the backend
blocks deleting yourself or the last admin). Skeleton rows while loading; empty
state when no match; toasts for outcomes.

### `Dump.jsx` (ADMIN — File Storage)
Per-admin file vault. A **storage usage bar** (used / 200MB). Upload area: a dashed
dropzone (shows "N files ready · size · click to change"), an optional notes input,
an Upload button that shows live **"Uploading… N%"** progress, and a **Cancel**
button (mid-upload only) that aborts via AbortController. A files table with a
type badge (IMAGE/ARCHIVE/TEXT/OTHER), size, upload time, and Download/Delete.
Batch mode: "Select & download as ZIP" reveals row checkboxes + "Select all" and a
"Download N as ZIP" action. Delete uses `useConfirm`. Empty state via `EmptyState`.

---

## 5.5 Components (`src/components/`)

### Shell & navigation
- **`Layout.jsx`** — the authenticated shell: `Sidebar` + `Navbar` + a scrollable
  `<main>` rendering the routed `<Outlet>` (with a per-route fade keyed on path),
  plus the mounted `CommandPalette`. Locks body scroll while the mobile drawer is
  open; tracks a `scrolled` flag for the nav's glass effect.
- **`Sidebar.jsx`** — left nav. Items: Dashboard, Projects, Test Cases, and (ADMIN
  only) Users, File Storage, API Docs (external Swagger link). Collapses to
  icon-only (78px ↔ 260px) via a toggle and **Ctrl/⌘+B**, persisted in
  `localStorage` (`sidebar-collapsed`). Has a "Quick Actions" (+ New Project), a
  **System Status** dot driven by `probeServices` (Operational / Asleep-waking /
  Checking) with a "Wake services" button, a user card, and a mobile drawer
  variant.
- **`Navbar.jsx`** — top bar: "QA Workspace" eyebrow, "Welcome back" + role pill,
  the signed-in user's name, a **⌘K** search button (dispatches a synthetic
  keydown so the palette opens), `ThemeToggle`, a **Help** button (`HelpModal`),
  and **Logout**. Hamburger on mobile.
- **`CommandPalette.jsx`** — listens for **⌘K / Ctrl+K** on `window`; a search
  overlay to jump between sections (ADMIN sees the extra entries). ↑↓ to navigate,
  Enter to open, Esc to close.
- **`ProtectedRoute.jsx`** — shows "Loading…" while auth resolves, redirects to
  `/login` if no user, and to `/` if `roles` is set and the user's role isn't in
  it.

### Feedback & overlays
- **`Modal.jsx`** — generic centered modal (`open`, `onClose`, `title`, children)
  with a backdrop.
- **`Toast.jsx`** — `ToastProvider` + `useToast()` returning `.success/.error/
  .info`. Toasts appear bottom-right and auto-dismiss after 4s.
- **`ConfirmDialog.jsx`** — `ConfirmProvider` + `useConfirm()`, a **promise-based**
  replacement for `window.confirm`: `await confirm({title, message, confirmLabel})`
  resolves true/false. Enter confirms, Esc cancels. **All destructive actions use
  this**, so automation must click the modal button, not handle a native dialog.
- **`HelpModal.jsx`** — in-app guide / keyboard shortcuts.

### Display & data
- **`StatsCard.jsx`** — a dashboard metric card (label, `CountUp` value, optional
  suffix, detail line, optional sparkline).
- **`CountUp.jsx`** — animates a number from 0 to target; respects
  `prefers-reduced-motion`.
- **`Skeleton.jsx`** — `Skeleton` plus presets `SkeletonStats`, `SkeletonCards`,
  `SkeletonTableRows` for loading states.
- **`EmptyState.jsx`** — sleeping-mascot illustration + title + description.
- **`Badge.jsx`** — colored status/priority pill.
- **`Pagination.jsx`** — Prev/Next + page indicator (`page`, `pages`,
  `onPageChange`).
- **`ThemeToggle.jsx`** — sun/moon button; flips `data-theme` via `ThemeContext`.

### Decorative
- **`MascotStage.jsx`** — the hand-built animated SVG mascot system for the auth
  pages (cursor tracking, blink/breathe, caps-lock alarm, password-strength mood,
  fail/celebrate reactions). Exports helpers `scorePassword`, `strengthToClass`,
  `useCapsLock`, `EyeIcon`, `EyeOff` that the auth forms reuse.

---

## 5.6 Styling

- **`index.css`** — the design system: custom component classes (`.card`,
  `.card-soft`, `.card-interactive`, `.btn`, `.btn-secondary`, `.input`,
  `.textarea`, `.label`, `.eyebrow`, `.display-title`, `.page-heading`,
  `.row-lift`, `.glass-nav`, `.app-panel`, `.route-fade`, …), animations, and the
  **additive dark-mode layer** scoped to `:root[data-theme="dark"]` (flips tokens,
  restyles component classes, remaps the inline Tailwind arbitrary colors used in
  pages). Light mode is never modified.
- **`tailwind.config.js` / `postcss.config.js`** — Tailwind content globs + theme
  extensions; PostCSS pipeline (tailwind + autoprefixer).
- **`App.css`** — older global styles, largely superseded by `index.css`.

Next: [06-api-reference.md](./06-api-reference.md).
