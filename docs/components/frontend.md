# Component: Frontend (React SPA)

**Path:** `frontend/` · **Stack:** React 19, Vite 8, Tailwind CSS 3, React Router 7,
axios, Recharts · **Host:** Vercel

Single-page app for the whole testHub UI. Talks only to the gateway via
`VITE_API_URL` (defaults to `http://localhost:3000`).

## Routes (`src/App.jsx`)
| Path | Page | Notes |
|---|---|---|
| `/login`, `/register` | Login, Register | Public; split-screen with dark hero. |
| `/` | Dashboard | Protected; stats + donut + recent runs. |
| `/projects` | Projects | Grid of project cards (create/delete). |
| `/projects/:projectId` | ProjectDetail | "Test Suites" for a project. |
| `/suites/:suiteId` | SuiteDetail | Test cases within a suite. |
| `/projects/:projectId/runs` | TestRuns | Runs list + 2-step create wizard. |
| `/runs/:runId` | RunDetail | Per-case result marking + summary. |
| `/users` | Users | ADMIN only (nested ProtectedRoute). |

## State & data
| Area | File(s) | Role |
|---|---|---|
| Auth state | `context/AuthContext.jsx` | Loads `/me` on boot, exposes `login/register/logout`. |
| Theme state | `context/ThemeContext.jsx` | Light/dark, persisted, OS-default. |
| HTTP client | `api/client.js` | axios instance: Bearer header, **401→refresh once**, **cold-start retry** (any 5xx/timeout, backoff up to ~8 tries). |
| Resource APIs | `api/{auth,projects,suites,testcases,runs,dashboard,users}.js` | Thin wrappers per endpoint. |
| Token storage | `api/tokenStorage.js` | get/set/clear access & refresh in localStorage. |
| Warm-up | `api/warmup.js` | Pings all services on load + on tab refocus. |

## Design system (`src/index.css`)
- Custom component classes: `.card`, `.card-soft`, `.btn`, `.btn-secondary`,
  `.input`, `.textarea`, `.label`, `.eyebrow`, `.display-title`, `.auth-hero`…
- **Hover (premium):** `.card-interactive` adds a lift + accent ring + deeper
  shadow; applied to clickable cards on Projects, ProjectDetail, TestRuns.
- **Dark mode:** an additive block scoped to `:root[data-theme="dark"]`. It flips
  the CSS design tokens, restyles the component classes, and remaps the specific
  inline Tailwind arbitrary colours used across pages. **Light mode is never
  modified** — dark is purely additive.

## Theming mechanics (how dark mode works without breaking anything)
1. `index.html` runs a tiny inline script *before paint* that sets
   `data-theme` on `<html>` from localStorage or OS preference (no flash).
2. `ThemeContext` keeps React state in sync and persists changes.
3. `ThemeToggle` (in the Navbar) flips the attribute.
4. CSS under `[data-theme="dark"]` does the rest. Because the dark selectors are
   more specific than the base utilities and only match when the attribute is
   present, the light theme renders identically to before.

## Env vars
`VITE_API_URL` — gateway base URL (build-time). On Vercel set it to the deployed
gateway; locally it defaults to `http://localhost:3000`.

## Gotchas
- Tokens live in `localStorage` (fine for a practice app; note for hardening).
- Several pages poll every 15s and re-warm on tab focus — intentional "live" feel
  given free-tier sleep.
- The UI has **no `data-testid` hooks**; UI automation relies on stable
  attributes + visible text. Adding test ids would make automation more robust.
