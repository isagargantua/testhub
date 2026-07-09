# 2. Repository Map (file by file)

Every file in the product code, with a one–two line purpose. `automation/` and
`postman/` are out of scope for this guide. Deep behavior is in the later
chapters; this is the index.

## 2.1 Root

```
testHub/
├── package.json            # npm workspaces (gateway, auth-service, core-service,
│                           #   frontend) + `npm run dev` runs all four via concurrently
├── render.yaml             # Render Blueprint: defines the 3 backend web services,
│                           #   their build/start commands, health checks, env vars
├── README.md               # Top-level intro + quick links + local-run instructions
├── DEPLOYMENT.md           # How to deploy: Render Blueprint + Vercel + Prisma notes
├── .env.example            # Sample root env (shared reference)
├── .gitignore
├── build_automation_guide.py   # Helper script that builds testhub-automation-guide.pdf
├── build_study_guide.py        # Helper script that builds the Postman study-guide PDF
├── testhub-automation-guide.pdf        # Generated PDF artifact
├── testHub_Postman_Study_Guide.pdf     # Generated PDF artifact
├── .github/workflows/keep-warm.yml     # Scheduled GitHub Action: pings /health to
│                                       #   keep free-tier services awake
├── intro/                 # High-level docs (architecture, story, automation spec)
└── deep-dive/              # ← this guide (exhaustive walkthrough)
```

The two `build_*.py` scripts and the `.pdf` files are study/portfolio artifacts;
they are not part of the running application.

## 2.2 gateway/

```
gateway/
├── package.json            # deps: express, cors, http-proxy-middleware,
│                           #   swagger-ui-express, morgan, dotenv
├── .env / .env.example     # AUTH_SERVICE_URL, CORE_SERVICE_URL, FRONTEND_URL,
│                           #   CORS_ORIGIN, PORT
└── src/
    ├── index.js            # The whole gateway: env validation, CORS allow-list,
    │                       #   /health, /docs (Swagger) + /openapi.json, and the
    │                       #   two proxy mounts (auth vs core) by path prefix
    └── openapi.js          # Hand-maintained OpenAPI 3 spec served at /docs;
                            #   importable into Postman
```

## 2.3 auth-service/

```
auth-service/
├── package.json            # deps: express, prisma/@prisma/client, bcryptjs,
│                           #   jsonwebtoken, express-validator, express-rate-limit,
│                           #   ioredis, cors, morgan, dotenv
├── .env.example            # DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET,
│                           #   REDIS_URL?, ENABLE_AUTH_RATE_LIMIT?, PORT
├── prisma/
│   └── schema.prisma       # The User model + UserRole enum (ADMIN/TESTER/VIEWER)
├── src/
│   ├── index.js            # App bootstrap: trust proxy, CORS, JSON, /health,
│   │                       #   mounts routes at /api/auth
│   ├── routes/auth.js      # ALL auth endpoints: register, login, me, refresh,
│   │                       #   logout, and ADMIN users CRUD (list/reset-pw/delete)
│   ├── middleware/
│   │   ├── auth.js         # getBearerToken, verifyToken, requireRole; optional
│   │   │                   #   Redis blacklist check (fails open)
│   │   └── rateLimiter.js  # OPT-IN limiters, OFF by default (no-op pass-through)
│   └── utils/
│       ├── jwt.js          # generate/verify access & refresh tokens
│       ├── prisma.js       # shared PrismaClient singleton
│       └── redis.js        # optional ioredis client (null if REDIS_URL unset)
└── tests/
    └── jwt.test.js         # Unit test(s) for the JWT helpers
```

## 2.4 core-service/

```
core-service/
├── package.json            # deps: express, prisma/@prisma/client, jsonwebtoken,
│                           #   multer, archiver, express-validator, ioredis,
│                           #   cors, morgan, dotenv
├── .env / .env.example     # DATABASE_URL, JWT_ACCESS_SECRET (must match auth),
│                           #   REDIS_URL?, PORT, DUMP_* limits
├── prisma/
│   └── schema.prisma       # Project, TestSuite, TestCase, TestRun, TestResult,
│                           #   DumpItem + all enums (also mirrors User)
├── src/
│   ├── index.js            # App bootstrap: CORS, JSON, /health, mounts the 6
│   │                       #   route files under /api/*
│   ├── routes/
│   │   ├── projects.js     # Project CRUD (list is paginated + owner-scoped)
│   │   ├── suites.js       # Suites within a project (owner-checked)
│   │   ├── testcases.js    # Cases within a suite + global /all view + /export
│   │   ├── runs.js         # Runs, result upsert, run CRUD, CSV/JSON export
│   │   ├── dashboard.js    # /stats aggregates + /results?status= drill-down
│   │   └── dumps.js        # ADMIN file-storage vault (upload/list/zip/download/delete)
│   ├── middleware/
│   │   └── auth.js         # Independent verifyToken + requireRole (+ blacklist)
│   └── utils/
│       ├── prisma.js       # shared PrismaClient singleton
│       ├── http.js         # parsePagination(), isNotFoundError() (P2025→404), csvEscape()
│       ├── ownership.js    # ownedProject/Suite/TestCase/Run — per-user isolation
│       └── redis.js        # optional blacklist check (fails open)
└── tests/
    └── auth.test.js        # Test(s) around auth/middleware behavior
```

## 2.5 frontend/

```
frontend/
├── package.json            # React 19, Vite, Tailwind, React Router 7, axios, Recharts
├── index.html              # Root HTML + pre-paint theme script (no dark/light flash)
├── vite.config.js          # Vite + @vitejs/plugin-react (minimal)
├── vercel.json             # Build command, output dir, SPA rewrite (all → index.html)
├── tailwind.config.js      # Tailwind content paths + theme extensions
├── postcss.config.js       # PostCSS (tailwind + autoprefixer)
├── eslint.config.js        # ESLint flat config
├── .env.example / .env.production.example   # VITE_API_URL (+ optional VITE_AUTH_URL/VITE_CORE_URL)
├── public/
│   ├── favicon.svg
│   └── icons.svg           # Sprite of UI icons
└── src/
    ├── main.jsx            # Entry: fires warm-up, then mounts <App/> in StrictMode
    ├── App.jsx             # Providers (Theme→Auth→Toast→Confirm) + all routes + TitleSync
    ├── index.css           # Design system: component classes + dark-mode layer + animations
    ├── App.css             # Legacy/global styles (mostly superseded by index.css)
    │
    ├── context/
    │   ├── AuthContext.jsx     # user state, login/register/logout, loads /me on boot
    │   └── ThemeContext.jsx    # light/dark theme state, persisted, OS-default
    │
    ├── api/                    # One thin module per backend area; all go through client.js
    │   ├── client.js           # axios instance: Bearer header, 401→refresh, cold-start retry
    │   ├── tokenStorage.js     # get/set/clear accessToken & refreshToken in localStorage
    │   ├── warmup.js           # ping each service /health directly; re-warm on focus
    │   ├── auth.js             # login, register, getMe, logout
    │   ├── projects.js         # getProjects, createProject, updateProject, deleteProject
    │   ├── suites.js           # getSuites, createSuite, deleteSuite
    │   ├── testcases.js        # getAllTestCases, getTestCases, createTestCase,
    │   │                       #   deleteTestCase, exportTestCases (blob download)
    │   ├── runs.js             # getRuns, createRun, getRun, updateRun, updateResult,
    │   │                       #   deleteRun, addTestCasesToRun
    │   ├── dashboard.js        # getDashboardStats, getResultsByStatus
    │   ├── users.js            # getUsers, resetUserPassword, deleteUser (ADMIN)
    │   └── dumps.js            # getDumps, uploadDumps (cancelable), downloadDump,
    │                           #   downloadDumpsZip, deleteDump
    │
    ├── pages/                  # One component per route
    │   ├── Login.jsx + Login.css   # Login form + animated mascot stage (also used by Register)
    │   ├── Register.jsx            # Register form (reuses Login.css + MascotStage)
    │   ├── Dashboard.jsx           # Stats cards + donut + breakdown drill-down + latest run
    │   ├── Projects.jsx            # Project card grid; create modal; optimistic delete
    │   ├── ProjectDetail.jsx       # Suites within a project; create/delete suite
    │   ├── SuiteDetail.jsx         # Test cases within a suite; create (full form)/delete
    │   ├── TestRuns.jsx            # Runs list; 2-step create wizard; inline status change
    │   ├── RunDetail.jsx           # Per-case result marking; progress bar; add-cases modal
    │   ├── AllTestCases.jsx        # Global test-case library: search/filter/export
    │   ├── Users.jsx               # ADMIN: user table, search, reset password, delete
    │   └── Dump.jsx                # ADMIN: file-storage vault UI
    │
    └── components/             # Reusable building blocks
        ├── Layout.jsx             # App shell: Sidebar + Navbar + <Outlet> + CommandPalette
        ├── Sidebar.jsx            # Left nav, collapsible (Ctrl+B), service-health dot, mobile drawer
        ├── Navbar.jsx             # Top bar: role pill, ⌘K button, theme toggle, Help, Logout
        ├── CommandPalette.jsx     # ⌘K/Ctrl+K quick-jump overlay
        ├── ProtectedRoute.jsx     # Gate: redirect to /login if unauth, to / if wrong role
        ├── Modal.jsx              # Generic modal (backdrop, title, children)
        ├── Toast.jsx              # Toast provider + useToast() (success/error/info)
        ├── ConfirmDialog.jsx      # Promise-based useConfirm() modal (replaces window.confirm)
        ├── HelpModal.jsx          # In-app user guide / shortcuts modal
        ├── MascotStage.jsx        # Animated SVG "goggle-buddy" mascots for auth screens
        ├── StatsCard.jsx          # Dashboard stat card (icon, label, CountUp value, sparkline)
        ├── CountUp.jsx            # Animated number 0→target (respects reduced-motion)
        ├── Skeleton.jsx           # Skeleton loaders: Skeleton, SkeletonStats, SkeletonCards, SkeletonTableRows
        ├── EmptyState.jsx         # Sleeping-mascot empty state (title + description)
        ├── Badge.jsx              # Status/priority colored pill
        ├── Pagination.jsx         # Prev/next + page indicator
        └── ThemeToggle.jsx        # Sun/moon button → flips data-theme + context
```

## 2.6 Quick "where do I change X?" table

| I want to change… | Go to |
|---|---|
| How a request is routed/proxied | `gateway/src/index.js` |
| The public API contract / Swagger | `gateway/src/openapi.js` |
| Login/register/refresh/token rules | `auth-service/src/routes/auth.js`, `auth-service/src/utils/jwt.js` |
| Admin user management (list/reset/delete) | `auth-service/src/routes/auth.js` |
| Project/suite/case/run business logic | `core-service/src/routes/*.js` |
| Who-can-see-what (data isolation) | `core-service/src/utils/ownership.js` |
| The database shape | `core-service/prisma/schema.prisma` |
| Dashboard math (pass rate, breakdown) | `core-service/src/routes/dashboard.js` |
| File-storage limits/behavior | `core-service/src/routes/dumps.js` |
| How the SPA calls the API / token refresh | `frontend/src/api/client.js` |
| A page's UI/behavior | `frontend/src/pages/<Page>.jsx` |
| Shared UI behavior (toasts, confirms, modal) | `frontend/src/components/*` |
| Theme / design tokens | `frontend/src/index.css`, `frontend/index.html` |
| Cold-start handling | `frontend/src/api/warmup.js`, `frontend/src/api/client.js`, `.github/workflows/keep-warm.yml` |
| Deployment config | `render.yaml`, `frontend/vercel.json`, `DEPLOYMENT.md` |

Next: [03-backend.md](./03-backend.md).
