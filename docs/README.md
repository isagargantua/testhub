# testHub Documentation

Start here.

| Doc | What it covers |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | **Read first.** System diagram, repo tree, data model, end-to-end request flow, cross-cutting concerns, local dev. |
| [PROJECT_STORY.md](./PROJECT_STORY.md) | The build story — how it helped me as a tester / vibe coder, API & UI testing, and the hard problems I solved (interview-ready). |
| [components/gateway.md](./components/gateway.md) | API gateway — proxy, CORS, Swagger docs. |
| [components/auth-service.md](./components/auth-service.md) | Identity — users, JWT, rate limiting. |
| [components/core-service.md](./components/core-service.md) | Domain — projects/suites/cases/runs/results, dashboard, export. |
| [components/frontend.md](./components/frontend.md) | React SPA — routes, state, design system, theming. |
| [components/automation.md](./components/automation.md) | Selenium, Playwright, and RestAssured frameworks. |

**For an AI agent picking this up cold:** read `ARCHITECTURE.md` end to end, then
the relevant `components/*.md` for the area you're changing. Each component doc
lists files, endpoints, env vars, and gotchas.
