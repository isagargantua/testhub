# testHub — Selenium Hybrid Automation Framework

A production-grade **hybrid** UI automation framework for the
[testHub](../../README.md) test-management platform.

> **Hybrid** here means three patterns working together:
> **Page Object Model** (maintainable UI layer) +
> **Data-Driven** (JSON / CSV / Excel external data) +
> **API-assisted** (RestAssured seeds state in milliseconds so UI tests start
> one click from the assertion). It also includes a **Keyword/Modular** reusable
> action layer in `BasePage`.

Built with **Java 17 · Selenium 4 · TestNG · ExtentReports · RestAssured ·
Log4j2 · Maven**. Parallel-ready, CI-friendly, zero hard-coded waits.

---

## 1. Why hybrid (and why it fits testHub)

testHub is a microservices app (React SPA → gateway → auth + core services →
Postgres) running on **free-tier hosting that cold-starts ~24s+**. Two
consequences shaped the design:

1. **Seed over the API, verify through the UI.** To test "mark a result", a pure
   UI test would click through register → project → suite → case → run (6
   screens) before it could even start. Instead the framework seeds that graph
   with `ApiClient` (RestAssured) in one call, injects the session into
   `localStorage`, and the browser opens already on the run. Faster, far less
   flaky, and the API seeding is itself covered by `tests/api`.
2. **Cold-start resilience is first-class.** A per-suite gateway warm-up, generous
   explicit waits (40s default), and a one-shot `RetryAnalyzer` turn transient
   boot failures into passes instead of red flakes.

---

## 2. Project layout

```
selenium-testhub/
├── pom.xml                       # deps + Surefire + profiles (smoke/regression/api/full)
├── src/main/java/com/testhub/
│   ├── config/ConfigManager      # -D > env > config.properties resolution
│   ├── constants/                # paths + app routes + localStorage keys
│   ├── driver/                   # DriverFactory (Selenium Manager) + ThreadLocal DriverManager
│   ├── enums/                    # Priority, ResultStatus, RunStatus, Role, BrowserType
│   ├── exceptions/               # FrameworkException
│   ├── utils/                    # Wait, JS, Alert, Screenshot, Json/Excel/File, TestDataFactory
│   ├── api/                      # RestAssured ApiClient + model POJOs  ← the hybrid half
│   ├── pages/                    # Page Objects (BasePage + 10 pages + components)
│   ├── reports/ExtentManager     # thread-safe Extent + ExtentTest
│   └── listeners/                # TestListener, RetryAnalyzer, RetryTransformer
├── src/test/java/com/testhub/tests/
│   ├── BaseTest                  # driver lifecycle + API login helpers
│   ├── ui/                       # Login, Register, Projects, Suite, TestCase,
│   │                             # TestRun, RunDetail, Dashboard, Users,
│   │                             # AllTestCases, Navigation, Theme
│   ├── e2e/EndToEndWorkflowTest  # full journey, UI-only
│   ├── api/                      # AuthApiTest, ProjectApiTest (pure API)
│   └── data/                     # DataProviders + data POJOs
└── src/test/resources/
    ├── config/config.properties  # all defaults (override with -D)
    ├── suites/                   # smoke / regression / api / full / verify TestNG XML
    ├── testdata/                 # testcases.json, invalid-logins.json, testcases.csv
    └── log4j2.xml
```

---

## 3. Prerequisites

- **JDK 17+** and **Maven 3.9+**
- **Chrome / Edge / Firefox** installed. No driver download needed — Selenium 4's
  **Selenium Manager** resolves the matching driver automatically.

---

## 4. Configuration

Every key in `src/test/resources/config/config.properties` is overridable, with
this precedence: **`-Dsystem.property` → `ENV_VAR` → properties file**.

| Key | Default | Notes |
|-----|---------|-------|
| `base.url` | `http://localhost:5173` | The SPA. Use your Vercel URL for the live app. |
| `api.base.url` | `http://localhost:3000` | Gateway. Live: `https://testhub-gateway.onrender.com` |
| `browser` | `chrome` | `chrome` \| `firefox` \| `edge` |
| `headless` | `false` | `true` for CI |
| `timeout.explicit` | `40` (s) | High, to absorb free-tier cold starts |
| `retry.count` | `1` | Retries a failed test once; `0` disables |
| `admin.email` / `admin.password` | … | Must map to a real ADMIN for the Users tests |

---

## 5. Running

```bash
# Default (regression suite, local app on :5173 + gateway on :3000)
mvn test

# Pick a suite via Maven profile
mvn test -Psmoke
mvn test -Pregression
mvn test -Papi
mvn test -Pfull

# Headless Chrome
mvn test -Psmoke -Dheadless=true

# Firefox
mvn test -Psmoke -Dbrowser=firefox

# Point at the LIVE deployment (no local backend needed)
mvn test -Papi -Dapi.base.url=https://testhub-gateway.onrender.com
mvn test -Psmoke -Dbase.url=https://<your-app>.vercel.app \
                 -Dapi.base.url=https://testhub-gateway.onrender.com

# Any specific suite XML
mvn test -DsuiteXmlFile=src/test/resources/suites/full.xml
```

### Reports & artifacts (under `test-output/`)
- `reports/testhub-extent-report.html` — rich report, screenshots embedded on failure
- `screenshots/` — PNG per failure
- `logs/automation.log` — full Log4j2 run log
- `downloads/` — files captured by the CSV/JSON export tests
- `../target/surefire-reports/` — TestNG/Surefire XML+HTML

---

## 6. What's covered

| Area | Tests |
|------|-------|
| **Auth** | valid/invalid login (data-driven), empty fields, wake-services hook, register happy-path + 4 client-side validations, route links |
| **Projects** | create (+ no description), delete (confirm dialog), open detail, ACTIVE status |
| **Suites** | create, open, delete |
| **Test Cases** | create from JSON data, all 4 priorities (data-driven), delete |
| **Runs** | two-step create wizard, status change from card, delete |
| **Run Detail** | mark PASS/FAIL/SKIP/BLOCKED, mixed results, **upsert overwrite**, run-status change, add cases to run |
| **Dashboard** | KPI cards, KPI reflects seeded data, result-breakdown filter |
| **Users (admin)** | search, reset password (verified via API re-login), delete (confirm), cancel delete — *auto-skips if the configured account isn't ADMIN* |
| **Library** | search, project filter, empty state, **CSV/JSON export download + content assertion** |
| **Navigation / RBAC** | sidebar routing, TESTER cannot see admin links, logout, protected-route redirect |
| **Theme** | toggle flips `data-theme` and persists across reload |
| **E2E** | full journey register → project → suite → case → run → result → dashboard, UI only |
| **API** | register/login/negative/duplicate, project→suite→case graph, delete |

Data-driven sources: `invalid-logins.json`, `testcases.json` (JSON),
`testcases.csv` (CSV), plus an Excel `@DataProvider` (`ExcelDataReader`) ready
for an `.xlsx` drop-in.

---

## 7. Design notes / industry-standard choices

- **No implicit waits, no `Thread.sleep`** in page code — every interaction goes
  through `WaitUtils` explicit conditions. Stable *and* fast.
- **Thread-safe parallelism** — `DriverManager` and `ExtentManager` use
  `ThreadLocal`; suites run `parallel="classes"`. Per-class instance fields stay
  thread-confined.
- **Locator strategy** — prefers `data-testid` (login), then stable `href`/label
  text, then scoped structural XPath. Reusable label/button builders live in
  `BasePage`.
- **Native dialogs** — project/user deletes use `window.confirm`; handled via
  `AlertUtils` (accept *and* dismiss paths both tested).
- **Self-cleaning test data** — `TestDataFactory` makes every name/email unique
  (timestamp + random) so parallel runs never collide on the shared backend.
- **Config-as-code** — the same JAR runs local, live, and CI by flipping `-D`
  flags only.

---

## 8. Known environment note (free-tier throttling)

The live deployment sits behind **free-tier infrastructure that rate-limits
`/api/auth/register`**. You'll see `HTTP 429 Too Many Requests` when many
registrations fire in a short period — e.g. parallel threads (`thread-count=3`)
plus retries, or many sequential runs in quick succession. Once tripped, the
block persists for a cooldown window (observed up to ~15 min) and will skip any
test whose `@BeforeMethod` seeds a fresh user. **This is the hosting edge, not
the framework.**

### Verified green against the live app (`https://mytesthub.vercel.app`)
- `EndToEndWorkflowTest` — full UI journey (register → project → suite → case →
  run → PASS → dashboard 100% pass rate). This alone exercises almost every page
  object.
- Smoke: valid login, registration, create project, dashboard KPIs, theme toggle.

### Running cleanly against the free tier
- **Pace it.** Run serially (`smoke-serial.xml` / `ui-verify.xml`) rather than
  `parallel="classes"`, and avoid back-to-back full runs.
- **Best option: a local backend.** Bring up auth/core/gateway locally
  (`npm run dev`, gateway on `:3000`) and run with
  `-Dapi.base.url=http://localhost:3000 -Dbase.url=http://localhost:5173`.
  There is no registration throttle locally, so the full parallel suite runs green.

### Headless note
Headless browsers must be sized to a desktop width (the framework forces
`1920x1080` via launch args and skips `maximize()` in headless). Below testHub's
`lg` breakpoint (1024px) the desktop sidebar is hidden, which would break
navigation tests.

The framework already retries genuine cold-start `5xx`/timeout failures; a
sustained `429` is intentionally surfaced rather than hidden.
```
