# testHub — Deep Dive

> **Audience:** any engineer or AI agent picking up testHub cold and needing to
> understand *the whole thing* — what it is, how it's built, every folder, every
> file, every endpoint, the database, the UI, and how it all fits together.
>
> This guide deliberately covers the **product code only**: `gateway/`,
> `auth-service/`, `core-service/`, and `frontend/`, plus root config and infra.
> The `automation/` and `postman/` folders (the test suites that *exercise*
> testHub) are intentionally **out of scope** here — they have their own docs in
> [`intro/components/automation.md`](../intro/components/automation.md).

If you only want a high-level summary, read [`intro/`](../intro) instead.
This guide is the deep version.

---

## What is testHub, in one paragraph?

testHub is a **test-management platform** — a mini TestRail. You create
**Projects**, add **Test Suites**, fill them with **Test Cases**, bundle cases
into **Test Runs**, then mark each case **PASS / FAIL / SKIP / BLOCKED** and watch
a live **Dashboard** aggregate the results. Admins additionally get a **User
management** screen and a **File Storage** vault. It is built as **microservices**:
a React single-page app talks to an Express **API gateway**, which proxies to two
Node/Express/Prisma services (**auth** and **core**) backed by one PostgreSQL
database. It runs on **free-tier** Render (backend) + Vercel (frontend), and a lot
of its engineering decisions exist to cope with free-tier cold starts. Its real
purpose is to be a **realistic, always-available target for QA test automation.**

---

## How to read this guide

Read in order for a full mental model, or jump to the part you're changing.

| # | File | What it covers |
|---|---|---|
| 1 | [01-architecture.md](./01-architecture.md) | The big picture: services, how a request flows end-to-end, why it's split this way, and how it was built. |
| 2 | [02-repository-map.md](./02-repository-map.md) | **Folder-by-folder, file-by-file.** Every file in the product code with a one–two line purpose. |
| 3 | [03-backend.md](./03-backend.md) | Deep dive on all three backend services: gateway, auth-service, core-service — every route file and helper. |
| 4 | [04-database.md](./04-database.md) | The full Prisma data model: every model, field, enum, relationship, cascade, and the per-user ownership rule. |
| 5 | [05-frontend.md](./05-frontend.md) | The React SPA: entry point, routing, contexts, the axios client, every page and every component. |
| 6 | [06-api-reference.md](./06-api-reference.md) | Complete REST reference: every endpoint, request body, response shape, and status codes. |
| 7 | [07-auth-security-infra.md](./07-auth-security-infra.md) | JWT auth, roles, per-user data isolation, rate limiting, cold-start handling, deployment, and every env var. |

---

## The 60-second mental model

```
Browser ── React SPA (Vercel)
            │  axios, Authorization: Bearer <JWT>
            ▼
        Gateway (Express)            ← single public entry point, /docs Swagger
            │  proxy by path prefix
       ┌────┴─────────────┐
       ▼                  ▼
  auth-service        core-service     ← each verifies the JWT locally
  (identity)          (the domain)
       └────────┬─────────┘
                ▼
          PostgreSQL  (Prisma)         ← auth owns User; core owns everything else
```

- **Entities:** `Project → TestSuite → TestCase`, and `TestRun → TestResult`
  (a result ties a case to a run).
- **Roles:** `ADMIN` (everything) and `TESTER` (everything except Users + File
  Storage). The very first registered user becomes ADMIN.
- **Isolation:** every user only ever sees **their own** projects/suites/cases/
  runs/results and their own uploaded files. Enforced in the backend per request.
- **Cold starts** dominate the ops story: free-tier services sleep after ~15 min
  and take ~24–90s to wake, so the app warms them, retries transparently, and a
  GitHub Action pings them on a schedule.

---

## Live + local

| | URL |
|---|---|
| Frontend | `https://mytesthub.vercel.app` |
| Gateway | `https://testhub-gateway.onrender.com` |
| Swagger | `https://testhub-gateway.onrender.com/docs` |

Local dev (from the repo root): `npm run dev` runs all four apps at once
(gateway :3000, auth :3001, core :3002, frontend :5173). See
[07-auth-security-infra.md](./07-auth-security-infra.md) for env vars and the
per-service setup.
