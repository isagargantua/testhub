# testHub

A small but realistic **test-management platform** (projects → suites → test
cases → runs → results) built as a **practice target for QA automation** and a
full-stack learning project. React SPA + an Express API gateway proxying to two
Node/Prisma microservices on PostgreSQL, deployed on free-tier Render + Vercel.

It ships with three automation suites that test it: **RestAssured** (API),
**Selenium**, and **Playwright** (UI).

## Quick links
- 📐 **[Architecture & end-to-end overview](./docs/ARCHITECTURE.md)** — start here
- 📖 **[The build story](./docs/PROJECT_STORY.md)** — why it exists, what it taught me, hard problems solved
- 🧩 **[Component docs](./docs/components)** — gateway, auth-service, core-service, frontend, automation
- 🧪 **Live API docs** — `https://testhub-gateway.onrender.com/docs` (Swagger UI)

## Layout
```
gateway/        API gateway (Express + http-proxy + Swagger /docs)
auth-service/   Identity: users, JWT, login/refresh (Express + Prisma)
core-service/   Domain: projects/suites/cases/runs/results + dashboard (Express + Prisma)
frontend/       React 19 + Vite + Tailwind SPA (light/dark theme)
automation/     selenium-testhub · playwright-testhub · restassured-testhub
postman/        Postman smoke-test collection
docs/           Architecture, component deep-dives, and the build story
```

## Run locally
```bash
cd auth-service && npm install && npm run dev   # :3001
cd core-service && npm install && npm run dev   # :3002 (run `npx prisma db push` first)
cd gateway      && npm install && npm run dev   # :3000
cd frontend     && npm install && npm run dev   # :5173 (talks to the gateway)
```
See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for env vars and details.

## Tech
React 19 · Vite · Tailwind 3 · Express 4 · Prisma 5 · PostgreSQL · JWT · Redis
(optional) · Render · Vercel · Java 17 · TestNG · RestAssured · Selenium ·
Playwright.
