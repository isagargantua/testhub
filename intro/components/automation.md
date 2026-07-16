# Component: Automation Framework

**Path:** `automation/testhub-automation/` · **Stack:** Java 17, Maven, TestNG, Selenium 4, RestAssured

One framework that tests testHub end to end — UI and API alike. It doubles as
the project's reason for existing (a practice target) and as a portfolio
piece. Full run instructions live in
[`automation/testhub-automation/RUNNING_TESTS.md`](../../automation/testhub-automation/RUNNING_TESTS.md);
this page is the architecture summary.

## Layout — split by domain, not by Maven's main/test

```
testhub-automation/
├── pom.xml
└── src/
    ├── framework/# reusable engine — config, driver, waits, reporting, listeners,
    │             #   enums, test-data factory & data providers (no tests)
    ├── api/      # RestAssured ApiClient + POJO models + pure-API tests
    │             #   (independent — never imports anything from ui/)
    ├── ui/       # Page Objects + pure-UI tests (real login/register forms only)
    ├── hybrid/   # API-assisted UI tests: seed/login over the API, verify via the UI
    └── resources/# config.properties, TestNG suites, testdata, log4j2.xml
```

The four code folders are registered as source roots by
`build-helper-maven-plugin`, so packages stay plain (`com.testhub.*`) while
the folders give the layer separation.

## Where each layer authenticates (a design rule, not an accident)

| Layer | How it signs in |
|---|---|
| `ui/` | **Through the browser only** — the real sign-up and login forms. Never the API. |
| `api/` | Directly against the gateway with RestAssured. Never a browser. |
| `hybrid/` | Logs in over the **API**, injects the session into `localStorage`, then asserts through the **UI**. The only place the two meet. |

This is the opposite of "always API-login-and-inject" — pure-UI tests
genuinely exercise the login/register forms, so a regression there gets
caught by the layer meant to catch it.

## Key pieces

- `DriverManager` (ThreadLocal) + `DriverFactory` (chrome/firefox/edge,
  headless, Selenium Manager — no driver downloads) → safe `parallel="classes"`.
- `BasePage` — no implicit waits, no `Thread.sleep`; every interaction goes
  through `WaitUtils` explicit conditions. `XPathUtil.quote()` escapes every
  dynamic XPath literal, so Faker-generated names with apostrophes can't break
  a locator.
- `AuthPage` (shared by `LoginPage`/`RegisterPage`) owns the
  "Services asleep? Wake them" flow, called once per suite.
- `ConfirmDialogComponent` — the app's destructive actions (delete project,
  delete user) go through a custom React confirm dialog, **not**
  `window.confirm()`. Selenium's `alertIsPresent`/`Dialog` APIs do not fire
  for it; interact with the dialog's own Delete/Cancel buttons.
- `RetryAnalyzer` + `RetryTransformer` — one automatic retry per test
  (`retry.count`, default `1`) absorbs a transient cold-start failure.
- `ExtentManager` — thread-safe ExtentReports; Allure is wired in parallel
  (`report.type=extent|allure|both`).

## Scenarios covered

| Layer | Tests |
|---|---|
| **UI** | Login, Register, Projects, Suites & Test Cases, Test Runs, Run Detail (mark + overwrite results), Test-Case Library (search/export/empty state), Users/admin (search, reset, single + **bulk delete**, select-all), Navigation & RBAC, Theme, Dashboard KPIs, and the full **E2E** journey (register → project → suite → case → run → result → dashboard) |
| **API** | Auth (register/login/negative/duplicate), the project → suite → case graph |
| **Hybrid** | API-seeded projects verified on the dashboard; standing-tester API login verified in the Projects UI |

## Cold starts & the register throttle

testHub runs on free-tier Render + Vercel. HTTP 429s on the live deployment
are Render's edge **rate-limiting requests routed to a hibernating service**
(`x-render-routing: hibernate-rate-limited`) — not the app's own limiter
(off by default, see `auth-service/src/middleware/rateLimiter.js`). The
framework handles this itself rather than asking the runner to work around
it:

- Warm-up polls every service's own `/health` (`health.check.urls`) before
  any real call — this is what actually wakes a hibernating container.
- `ApiClient` retries a 429 up to 3 times with backoff (`Retry-After` aware).
- UI tests default to `reuse.user=true` — signing in as the standing tester
  through the form, never registering, so the throttle is never touched.
- API tests that need a fresh account register once per test class, not per
  method.

Verified green against the live app (`https://mytesthub.vercel.app`):
API 7/7, smoke 9/9, full regression 25/25 — zero retries needed.

## data-testid availability

| Element | data-testid |
|---|---|
| Login email / password / submit | `login-email` / `login-password` / `login-submit` |
| Wake services button / status | `wake-services` / `wake-status` |
| Register name / email / password / confirm / submit | `register-name` / `register-email` / `register-password` / `register-confirm` / `register-submit` |
| Users: select-all / per-row checkbox / bulk delete | `select-all-users` / `select-user` / `bulk-delete` |

Other pages (Dashboard, Projects, Dump, etc.) don't yet have `data-testid`
hooks — the framework locates those by stable `href`, label text, or scoped
structural XPath (see `BasePage.fieldByLabel` / `buttonByText`).

## Run

```bash
cd automation/testhub-automation
mvn test               # default = regression (UI + API + hybrid)
mvn test -Psmoke        # fast confidence check across every layer
mvn test -Papi          # API only, no browser
```

Reports: `test-output/reports/Latest/Report-<timestamp>_<user>.html`
(ExtentReports) and `target/allure-results/` (`mvn allure:serve`). Full
walkthrough — including Eclipse and VS Code setup — in
[`RUNNING_TESTS.md`](../../automation/testhub-automation/RUNNING_TESTS.md).
