# Component: Frontend (React SPA)

**Path:** `frontend/` · **Stack:** React 19, Vite 8, Tailwind CSS 3, React Router 7,
axios, Recharts · **Host:** Vercel · **Live URL:** `https://mytesthub.vercel.app`

Single-page app for the whole testHub UI. Talks only to the gateway via
`VITE_API_URL` (defaults to `http://localhost:3000`).

---

## Routes (`src/App.jsx`)

| Path | Page component | Auth | Notes |
|---|---|---|---|
| `/login` | `Login` | Public | Email + password, mascot animation stage. |
| `/register` | `Register` | Public | 4-field form, same mascot stage. |
| `/` | `Dashboard` | Any | Stats cards + donut chart + recent runs. |
| `/projects` | `Projects` | Any | Grid of project cards (create/delete). |
| `/projects/:projectId` | `ProjectDetail` | Any | Suites list for a project. |
| `/suites/:suiteId` | `SuiteDetail` | Any | Test cases within a suite. |
| `/projects/:projectId/runs` | `TestRuns` | Any | Runs list + 2-step create wizard. |
| `/runs/:runId` | `RunDetail` | Any | Per-case result marking + summary. |
| `/test-cases` | `AllTestCases` | Any | Global test case library (search + filter). |
| `/users` | `Users` | ADMIN only | User table — search, reset password, delete. |
| `/dump` | `Dump` | ADMIN only | Per-admin file storage vault (upload/download/delete). |

All authenticated routes are wrapped in `<ProtectedRoute>`. ADMIN-only routes use
`<ProtectedRoute roles={["ADMIN"]}>` which redirects TESTER users back to `/`.

---

## State & data

| Area | File(s) | Role |
|---|---|---|
| Auth state | `context/AuthContext.jsx` | Loads `/api/auth/me` on boot; exposes `login`, `register`, `logout`. |
| Theme state | `context/ThemeContext.jsx` | Light/dark, persisted in `localStorage`, defaults to OS preference. |
| HTTP client | `api/client.js` | axios instance: attaches Bearer header, **401 → refresh once**, **cold-start retry** (any 5xx or network timeout, up to 8 attempts with backoff, max 15s/attempt). User-canceled uploads (AbortController) are never retried. |
| Auth API | `api/auth.js` | login, register, logout, me, getUsers, deleteUser, resetUserPassword. |
| Projects API | `api/projects.js` | CRUD for projects. |
| Suites API | `api/suites.js` | CRUD for suites. |
| Test Cases API | `api/testcases.js` | CRUD for cases; global `/all` list; `/export` CSV/JSON. |
| Runs API | `api/runs.js` | create run, list runs, get run, mark result, delete run. |
| Dashboard API | `api/dashboard.js` | stats, results-by-status. |
| Users API | `api/users.js` | wraps getUsers, deleteUser, resetUserPassword (ADMIN). |
| Dumps API | `api/dumps.js` | list, upload (multipart, cancelable via AbortSignal, progress callback), download single file, download batch as ZIP, delete. |
| Token storage | `api/tokenStorage.js` | get/set/clear `accessToken` and `refreshToken` in `localStorage`. |
| Warm-up | `api/warmup.js` | Pings all three services on load and on tab/window refocus; used by Login, Register, and Sidebar. |

---

## Pages (detailed)

### `Login.jsx`
- Email + password form.
- `MascotStage` with 4 animated "goggle buddy" SVG characters. Modes: `cursor`
  (eyes track mouse), `email` / `password` (lean to field), `away` (look away
  when password revealed), `fail` (head-shake, escalating facepalm on repeat),
  `celebrate` (hop + sparkles), `caps` (wide-eyed), `sleeping` (eyes closed +
  Zzz when services are cold), `waking` (stretch/yawn on wake).
- "Services asleep? Wake them" button → `wakeServices()` → shows status text.
- On success → navigate to `/`.
- **data-testid:** `login-email`, `login-password`, `login-submit`, `wake-services`, `wake-status`.

### `Register.jsx`
- Name + Email + Password + Confirm Password.
- Same `MascotStage` as Login: password mismatch → `worried` prop, strong
  password → `pw-strong` mood, caps lock → caps warning inline.
- Eye-reveal toggles on both password fields; mascots look away when revealed.
- On success → auto-navigate to `/`.
- **data-testid:** `register-name`, `register-email`, `register-password`, `register-confirm`, `register-submit`, `wake-services`, `wake-status`.

### `Dashboard.jsx`
- 4 `StatsCard` components with `CountUp` animated numbers: Total Projects,
  Test Cases, Runs, Pass Rate %.
- Recharts donut chart of result breakdown (PASS/FAIL/SKIP/BLOCKED).
- Clicking a segment opens a status-filter panel with paginated test cases.
- Recent Runs list. Latest Run expandable per-case table.
- Auto-refreshes every 15 s + on tab focus.

### `Projects.jsx`
- Responsive card grid. "Create Project" button → `Modal` with name + description.
- Delete uses `useConfirm` (custom React modal, NOT `window.confirm`).
- Optimistic delete (card removed immediately; re-inserted on error).
- Empty state: `EmptyState` component with sleeping mascot.
- Auto-refresh every 15 s + on tab focus.

### `ProjectDetail.jsx`
- Project header + list of test suites.
- "Create Suite" → `Modal`. Delete suite → `useConfirm`.

### `SuiteDetail.jsx`
- Suite header + test case table.
- "Add Test Case" → `Modal` with title, description, priority dropdown.
- Edit / Delete per case.

### `TestRuns.jsx`
- Run list for a project.
- "Create Run" → 2-step modal: step 1 pick suite, step 2 multi-select test cases.

### `RunDetail.jsx`
- Per-case result marking: status dropdown (PENDING/PASS/FAIL/SKIP/BLOCKED) +
  notes text input per row. Auto-saves on change.
- Run overall status recalculates automatically from results.

### `AllTestCases.jsx`
- Paginated global view of all test cases the current user owns.
- Search by keyword (`?search=`), filter by project (`?projectId=`).
- Card grid: title, priority badge, project name, suite name.
- Export button → downloads CSV or JSON via `GET /api/testcases/export`.
- Empty state with sleeping mascot.

### `Users.jsx` (ADMIN only)
- Searchable, paginated table: Name + UUID, Email, Role badge, Created At, Actions.
- "Reset password" → `Modal` (pre-filled with `Test@12345`).
- "Delete" → `useConfirm` → `deleteUser()` → success toast.
- Skeleton loaders during fetch. Empty state with mascot.

### `Dump.jsx` (ADMIN only — File Storage)
- Per-admin private file vault.
- Storage usage progress bar showing used / limit (200 MB) with %.
- **Upload:** dashed dropzone (click to pick files, shows "N files ready · size ·
  click to change") → optional notes input → "Upload" button. Cancel button
  appears mid-upload to abort via AbortController.
- **File table:** checkbox column (batch mode), filename + notes, type badge
  (IMAGE/ARCHIVE/TEXT/OTHER), size, uploaded datetime, Download + Delete.
- **Batch mode:** "Select & download as ZIP" → checkboxes appear + "Select all"
  header → "Download N as ZIP" + "Cancel" buttons.
- **Individual:** Download (streams file to browser), Delete → `useConfirm`.
- Empty state with sleeping mascot.

---

## Key shared components (`src/components/`)

| Component | What it does |
|---|---|
| `Layout.jsx` | Outer shell: Sidebar + Navbar + `<Outlet>`. Provides keyboard shortcuts (Ctrl+B sidebar, Ctrl+K palette). |
| `Sidebar.jsx` | Left nav — collapses to icon-only (78px) via Ctrl+B/⌘B toggle, persisted in localStorage. Shows all nav items; ADMIN-only items (`/users`, `/dump`, API Docs) are conditionally rendered. System Status section with service health dot. |
| `Navbar.jsx` | Top bar — role pill, ⌘K palette button, theme toggle, Help button, Logout. |
| `CommandPalette.jsx` | ⌘K / Ctrl+K overlay — fuzzy search across nav items. Keyboard: ↑↓ navigate, Enter open, Esc close. |
| `MascotStage.jsx` | 4-character animated SVG mascot stage used on Login and Register. Exports: `MascotStage` (default), `scorePassword`, `strengthToClass`, `useCapsLock`, `EyeIcon`, `EyeOff`. |
| `Toast.jsx` | Bottom-right toast queue. Types: success (green), error (red), info (purple). Auto-dismisses after 4 s. `useToast()` hook: `.success(msg)`, `.error(msg)`, `.info(msg)`. |
| `ConfirmDialog.jsx` | Custom React confirm modal (never `window.confirm`). `useConfirm()` hook returns a promise-based `confirm({ title, message, confirmLabel })`. Enter = confirm, Esc = cancel. |
| `Modal.jsx` | Generic centered modal with backdrop. Props: `open`, `onClose`, `title`, `children`. |
| `EmptyState.jsx` | Sleeping mascot illustration + title + description. Used across all list-empty states. |
| `Skeleton.jsx` | Skeleton loader components: `SkeletonTableRows` (animated placeholder rows for tables), `SkeletonCard` (for card grids). |
| `StatsCard.jsx` | Dashboard stat card with icon, label, animated CountUp value. |
| `CountUp.jsx` | Animated number from 0 → target, with easing. Respects `prefers-reduced-motion`. |
| `Pagination.jsx` | Previous / Next buttons + "N of M pages" text. |
| `Badge.jsx` | Status/priority colored pill label. |
| `ThemeToggle.jsx` | Sun/moon icon button; flips `data-theme` attribute + ThemeContext state. |
| `ProtectedRoute.jsx` | Redirects unauthenticated users to `/login`; optional `roles` prop redirects wrong-role users to `/`. |
| `HelpModal.jsx` | Help overlay with keyboard shortcuts and app info. |

---

## Design system (`src/index.css`)

Custom component classes used throughout:

| Class | Usage |
|---|---|
| `.card` | Standard bordered, rounded content block |
| `.card-soft` | Softer background variant of card |
| `.card-interactive` | Adds hover lift + accent ring + deeper shadow — used on clickable cards |
| `.btn` | Primary action button (indigo/amber gradient) |
| `.btn-secondary` | Subdued outlined button |
| `.input` | Standard text input |
| `.textarea` | Multiline input |
| `.label` | Form field label |
| `.eyebrow` | Small uppercase meta label |
| `.display-title` | Large serif page title |
| `.auth-hero` | Background panel for Login/Register left side |
| `.row-lift` | Table row hover lift effect |
| `.page-heading` | Flex header row for page title + info card |

**Dark mode:** additive block scoped to `:root[data-theme="dark"]`. Flips CSS
design tokens and remaps component classes + inline Tailwind values. Light mode is
never modified — dark is purely additive.

---

## Theming mechanics

1. `index.html` runs a tiny inline script before first paint: reads `localStorage`
   or OS preference, sets `data-theme` on `<html>` (no flash on load).
2. `ThemeContext` keeps React state in sync and persists changes.
3. `ThemeToggle` in Navbar flips the attribute.
4. CSS under `[data-theme="dark"]` does the rest.

---

## Env vars

`VITE_API_URL` — gateway base URL (build-time). On Vercel set it to the deployed
gateway; locally defaults to `http://localhost:3000`.

---

## Gotchas

- Tokens live in `localStorage` (`accessToken`, `refreshToken`). Fine for a
  practice app; note for hardening.
- **Login and Register DO have `data-testid` attributes** — see per-page details
  above. Other pages use role/label/text selectors.
- Custom `ConfirmDialog` is used for all destructive actions. `window.confirm` is
  **never called** — automation must interact with the React modal.
- Toast notifications appear bottom-right; assert them (not inline divs) for
  action feedback in tests.
- Several pages poll every 15 s and re-warm on tab focus — intentional live feel
  given free-tier sleep.
- Sidebar collapses to icon-only at 78px; elements may go off-screen. `Ctrl+B`
  expands it. State persists in localStorage as `sidebar-collapsed`.
- Upload cancellation uses `AbortController` — the cancel button fires
  `controller.abort()`, which rejects the axios request as a cancel (not an error).
  The client never retries a canceled request.
