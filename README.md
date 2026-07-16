# testHub

A small but realistic **test-management platform** (projects → suites → test
cases → runs → results) built as a **practice target for QA automation** and a
full-stack learning project. React SPA + an Express API gateway proxying to two
Node/Prisma microservices on PostgreSQL, deployed on free-tier Render + Vercel.

It ships with a Java/Selenium/TestNG/RestAssured automation suite that tests
it end to end, UI and API alike.

## Quick links
- 📐 **[Architecture & end-to-end overview](./intro/ARCHITECTURE.md)** — start here
- 📖 **[The build story](./intro/PROJECT_STORY.md)** — why it exists, what it taught me, hard problems solved
- 🧩 **[Component docs](./intro/components)** — gateway, auth-service, core-service, frontend, automation
- 🤖 **[Automation spec](./intro/AUTOMATION_SPEC.md)** — full feature/API inventory for test-automation agents
- 📚 **[Deep dive](./deep-dive)** — exhaustive, file-by-file walkthrough of the whole repo (for anyone or any agent picking it up cold)
- 🧪 **Live API docs** — `https://testhub-gateway.onrender.com/docs` (Swagger UI)

## Layout
```
gateway/        API gateway (Express + http-proxy + Swagger /docs)
auth-service/   Identity: users, JWT, login/refresh (Express + Prisma)
core-service/   Domain: projects/suites/cases/runs/results + dashboard (Express + Prisma)
frontend/       React 19 + Vite + Tailwind SPA (light/dark theme)
automation/     testhub-automation — Selenium + TestNG + RestAssured (UI, API, hybrid)
postman/        Postman smoke-test collection
intro/          High-level: architecture, component deep-dives, build story, automation spec
deep-dive/      Exhaustive, file-by-file walkthrough of the entire repo
```

## Run locally
```bash
cd auth-service && npm install && npm run dev   # :3001
cd core-service && npm install && npm run dev   # :3002 (run `npx prisma db push` first)
cd gateway      && npm install && npm run dev   # :3000
cd frontend     && npm install && npm run dev   # :5173 (talks to the gateway)
```
See [`intro/ARCHITECTURE.md`](./intro/ARCHITECTURE.md) for env vars and details, or [`deep-dive/`](./deep-dive) for a full file-by-file walkthrough.

## Tech
React 19 · Vite · Tailwind 3 · Express 4 · Prisma 5 · PostgreSQL · JWT · Redis
(optional) · Render · Vercel · Java 17 · TestNG · RestAssured · Selenium ·
Playwright.
