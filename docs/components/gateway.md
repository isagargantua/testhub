# Component: Gateway

**Path:** `gateway/` · **Runtime:** Node + Express 4 · **Port:** 3000

The single public entry point for the API. It does three jobs: proxy requests to
the right backend service, enforce CORS, and serve interactive API docs.

## Responsibilities
- **Reverse proxy** (via `http-proxy-middleware`):
  - `/api/auth/*` → **auth-service** (`AUTH_SERVICE_URL`)
  - `/api/projects`, `/api/suites`, `/api/testcases`, `/api/runs`,
    `/api/dashboard` → **core-service** (`CORE_SERVICE_URL`)
- **CORS** allow-list built from `FRONTEND_URL` + `CORS_ORIGIN` (+ localhost).
- **`GET /health`** — liveness probe (also used by the keep-warm workflow).
- **`GET /docs`** — Swagger UI; **`GET /openapi.json`** — raw OpenAPI 3 spec.
  Mounted *before* the proxy so they're served locally, not forwarded.

## Key files
| File | What it does |
|---|---|
| `src/index.js` | Env validation, CORS, `/health`, Swagger mount, proxy routes. Proxy timeout is 120s to tolerate upstream cold starts. |
| `src/openapi.js` | Hand-maintained OpenAPI 3 spec describing every endpoint. Importable into Postman; the source of truth for the docs page. |

## Env vars
| Var | Purpose |
|---|---|
| `AUTH_SERVICE_URL` | Base URL of auth-service (required) |
| `CORE_SERVICE_URL` | Base URL of core-service (required) |
| `FRONTEND_URL`, `CORS_ORIGIN` | Allowed browser origins (comma-separated ok) |
| `PORT` | Defaults to 3000 |

## Gotchas
- The proxy uses `pathRewrite` to forward the **original URL** unchanged.
- `xfwd: true` forwards `X-Forwarded-For`; relevant to auth-service IP keying.
- Adding a new backend route prefix means adding it to the proxy mount list here.
