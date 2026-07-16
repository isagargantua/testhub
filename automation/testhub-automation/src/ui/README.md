# `ui/` — the UI layer (Selenium, Page Object Model)

Everything for driving the app **through a real browser**.

| Package | What it does |
|---|---|
| `pages/` | One Page Object per screen (`LoginPage`, `DashboardPage`, `ProjectsPage`, `UsersPage`, …). Each exposes business actions ("create a project"), never raw Selenium calls |
| `pages/components/` | Reusable UI pieces shared across screens: navbar, sidebar, modal, confirm dialog |
| `tests/ui/` | Pure-UI tests — every action goes through the browser, including login (the real form) |
| `tests/e2e/` | The full end-to-end journey (register → project → suite → case → run → result → dashboard) |

**Rule:** UI tests authenticate through the real login/register forms only —
never over the API. (API-assisted setup lives in `hybrid/`.)
