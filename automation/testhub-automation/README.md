# testHub Automation

UI + API test automation for the [testHub](../../README.md) platform, organised so
the **UI** and **API** halves are cleanly separated and easy to find your way around.

Built with **Java 17 · Selenium 4 · TestNG · RestAssured · ExtentReports · Log4j2 · Maven**.

---

## 1. How it's organised

The project is split **by domain**, not by Maven's usual `main` / `test`:

```
testhub-automation/
├── pom.xml
└── src/
    ├── common/   # shared core — config, driver, waits, reporting, listeners,
    │             #   enums, test-data factory & data providers
    ├── api/      # the API layer: RestAssured ApiClient + POJO models + pure-API tests
    │             #   (independent — never imports anything from ui/)
    ├── ui/       # Page Objects + pure-UI tests (login is done through the real form)
    ├── hybrid/   # exactly ONE test: logs in & seeds over the API, verifies via the UI
    └── resources/# config.properties, TestNG suites, testdata, log4j2.xml
```

The four code folders are wired in as source roots by `build-helper-maven-plugin`,
so packages stay plain (`com.testhub.*`) while the folders give you the separation.

### Where login happens (important)

| Layer | How it authenticates |
|-------|----------------------|
| **`ui/`** | **Through the browser only** — the real sign-up and login forms. No API. |
| **`api/`** | Directly against the gateway with RestAssured. No browser. |
| **`hybrid/`** | Logs in over the **API**, injects the session into the browser, then asserts through the **UI**. This is the *only* place the API touches the browser. |

So a pure-UI login test lives in `ui/` and drives the form; the API-assisted
tests are unmistakable — they sit by themselves in `hybrid/`.

### Fresh vs existing user

UI tests sign in via `BaseTest.signInTester()`, controlled by **`reuse.user`** in
`config.properties`:

- `true` (default) — log in through the form as the **standing tester account**
  (`tester.email` / `tester.password`). No registration → never trips the live
  free-tier 429 throttle on `/api/auth/register`.
- `false` — register a brand-new throwaway account per test for maximum isolation.

`loginAsAdmin()` signs in with the standing `admin.email` / `admin.password`.
Tests that assert fresh-account state (e.g. `DashboardTest`'s zero KPIs, the E2E
journey) always register fresh regardless of the flag.

The two hybrid tests mirror this split:

| Test | Account | Why |
|------|---------|-----|
| `ApiLoginDashboardTest` | fresh (API register) | asserts exact KPI counts, needs an empty account |
| `ApiLoginExistingUserTest` | standing tester (API login) | throttle-free; seeds a project via API, verifies it in the UI, deletes it after |

---

## 2. Prerequisites

- **JDK 17+** and **Maven 3.9+**
- **Chrome / Edge / Firefox** installed. No driver download — Selenium 4's
  Selenium Manager resolves the matching driver automatically.

---

## 3. Running

```bash
mvn test                 # default = regression (UI + API + hybrid)
mvn test -Pui            # pure-UI tests only
mvn test -Papi           # pure-API tests only
mvn test -Phybrid        # just the one API-assisted UI test
mvn test -Psmoke         # fast smoke set across all layers
mvn test -Pfull          # everything

mvn test -Pui -Dheadless=true          # headless
mvn test -Pui -Dbrowser=firefox        # another browser

# Point at a local stack instead of the live deployment:
mvn test -Pui -Dbase.url=http://localhost:5173 -Dapi.base.url=http://localhost:3000
```

All knobs live in `src/resources/config/config.properties` and are overridable with
`-D<key>` (system property) or an env var — same build runs local, live, or in CI.

---

## 3.1 Reporting — ExtentReports, Allure, or both

Pick the reporter with the **`report.type`** key (`extent` | `allure` | `both`,
default `both`) — either in `config.properties` or per run:

```bash
mvn test -Pui -Dreport.type=extent    # ExtentReports only
mvn test -Pui -Dreport.type=allure    # Allure only
mvn test -Pui                          # both (default)
```

| Reporter | Where it lands | How to view |
|----------|----------------|-------------|
| **ExtentReports** | `test-output/reports/Latest/Report-<timestamp>_<user>.html` (previous runs auto-archived) | Open the HTML file directly |
| **Allure** | raw results in `target/allure-results/` | `mvn allure:serve` (opens in browser) or `mvn allure:report` (static HTML in `target/site/`) |

Both reporters embed an end-of-test **screenshot** on failure/skip (and on pass
too when `screenshot.on.success=true`). Other artifacts: `test-output/screenshots/`
(PNGs), `test-output/logs/` (Log4j2), and `target/surefire-reports/`.

> Note: Allure's TestNG listener is registered automatically by its jar, so raw
> result JSON is always written to `target/allure-results/` — `report.type` controls
> which report you actually build/attach screenshots to. The JSON is harmless and
> cleaned by `mvn clean`.

---

## 4. What's covered

| Layer | Tests |
|-------|-------|
| **UI** (`ui/`) | Login (valid via form, invalid data-driven, empty), Register (happy path + validations), Projects (create / delete / open), Dashboard (fresh-user KPIs), and a full **E2E** journey register → project → suite → case → run → result → dashboard |
| **API** (`api/`) | Auth (register/login/negative/duplicate) and the project → suite → case graph |
| **Hybrid** (`hybrid/`) | API login + API-seeded projects, verified on the dashboard through the UI |

### Living with the free-tier throttle

Render's edge answers **HTTP 429** for requests routed to a *hibernating*
service (`x-render-routing: hibernate-rate-limited`) — it is not the app's own
rate limiter. The framework defends in three layers:

1. **Warm-up wakes everything** — before any API/hybrid class runs, every URL
   in `health.check.urls` (gateway, auth, core) is polled until healthy, which
   is also what wakes them. UI tests wake services through the login screen's
   on-page "Wake them" button instead, once per suite.
2. **Bounded 429 backoff** — `ApiClient` retries a throttled register/login up
   to 3 times (honouring `Retry-After` when present).
3. **Register frugally** — API login tests use the standing tester account,
   `ProjectApiTest` registers one user per class (unique project names keep
   tests isolated), and only the throttle-free hybrid test is in the smoke set.

For heavy back-to-back full runs, a local backend
(`-Dbase.url=http://localhost:5173 -Dapi.base.url=http://localhost:3000`)
remains the most comfortable option.
