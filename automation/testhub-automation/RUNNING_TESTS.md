# Running the testHub Automation Suite — The Complete Guide

Everything about executing this framework: what runs, where it runs, how to run
it from the **command line**, **Eclipse**, and **VS Code**, how to run a single
test or a whole layer, where the reports land, and how to debug when something
goes wrong.

> TL;DR — from this folder (`automation/testhub-automation/`):
> ```bash
> mvn test -Psmoke -Dheadless=true     # fast confidence check, all layers
> mvn test -Papi                       # API only (no browser, ~20 s warm)
> mvn test                             # full regression (UI + API + hybrid)
> ```

---

## Table of contents

1. [Prerequisites](#1-prerequisites)
2. [What happens when a test runs (the full flow)](#2-what-happens-when-a-test-runs-the-full-flow)
3. [The test inventory — every class, group, and suite](#3-the-test-inventory)
4. [Running from the command line (Maven)](#4-running-from-the-command-line-maven)
5. [Running in Eclipse](#5-running-in-eclipse)
6. [Running in VS Code](#6-running-in-vs-code)
7. [Configuration — every knob and how to override it](#7-configuration)
8. [Reports, screenshots, and logs](#8-reports-screenshots-and-logs)
9. [Live vs local backend](#9-live-vs-local-backend)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

| Requirement | Version | Check with | Notes |
|---|---|---|---|
| **JDK** | 17+ | `java -version` | The pom compiles with `--release 17` |
| **Maven** | 3.9+ | `mvn -version` | Wrapper not included — install Maven itself |
| **Browser** | Chrome / Edge / Firefox | — | **No driver download needed.** Selenium 4's built-in *Selenium Manager* fetches and caches the matching driver automatically on first run |
| **Internet** | — | — | Default config targets the **live** deployment (Vercel + Render) |

Nothing else. No `chromedriver.exe`, no PATH edits, no local services (unless
you *choose* to run against a local backend — see [section 9](#9-live-vs-local-backend)).

---

## 2. What happens when a test runs (the full flow)

Understanding the lifecycle makes every "why did X happen?" question answerable.

```
mvn test -P<profile>
 │
 ├─ 1. Maven profile picks a TestNG suite XML  (src/resources/suites/<name>.xml)
 │      e.g. -Psmoke → suites/smoke.xml.  Override directly with
 │      -DsuiteXmlFile=src/resources/suites/ui.xml
 │
 ├─ 2. Surefire boots TestNG with that XML
 │      The XML registers two listeners for the whole run:
 │        • TestListener      → drives ExtentReports + logs START/PASS/FAIL
 │        • RetryTransformer  → attaches RetryAnalyzer to every @Test
 │                              (one retry on failure by default; retry.count=0 disables)
 │
 ├─ 3. Per TEST CLASS (@BeforeClass)
 │      API & hybrid classes warm the backend first:
 │      ApiClient.waitUntilAllServicesHealthy() polls EVERY /health URL in
 │      health.check.urls until all answer 200 — this is what wakes the
 │      hibernating free-tier services (gateway, auth, core). Skipped when
 │      warmup.enabled=false (local runs).
 │
 ├─ 4. Per TEST METHOD (UI layers only — BaseTest)
 │      @BeforeMethod  → DriverFactory.createDriver()
 │                        • reads browser/headless/window.size from config
 │                        • registers the driver in a ThreadLocal (DriverManager)
 │                          → this is what makes parallel="classes" safe
 │      the test body  → drives Page Objects; every interaction goes through
 │                        explicit waits (WaitUtils) — no Thread.sleep in pages
 │      @AfterMethod   → screenshot captured (failure always; success only if
 │                        screenshot.on.success=true), then driver.quit()
 │
 ├─ 5. First auth screen of the whole suite (UI runs)
 │      BaseTest wakes services ONCE via the on-page
 │      "Services asleep? Wake them" button (login or register screen),
 │      bounded by wake.timeout.seconds (default 90 s).
 │
 └─ 6. Suite finish
        TestListener flushes ExtentReports →
          test-output/reports/Latest/Report-<timestamp>_<user>.html
        Allure raw results (always written) → target/allure-results/
```

**Where authentication happens per layer** (this is a design rule, not an accident):

| Layer | Sign-in path |
|---|---|
| `ui/` | Browser only — the real login/register forms. Never the API. |
| `api/` | RestAssured straight at the gateway. Never a browser. |
| `hybrid/` | Logs in over the **API**, injects the tokens into `localStorage`, then verifies through the **UI**. The only place the two meet. |

**Fresh vs standing user (UI):** `reuse.user=true` (default) signs in as the
standing tester (`tester.email`/`tester.password`) through the login form — no
registration, so the live register throttle is never touched. Tests that *need*
a pristine account (Dashboard zero-KPIs, the E2E journey, `RegisterTest`)
always register fresh regardless.

---

## 3. The test inventory

### Test classes

| Class | Layer | Groups | What it proves |
|---|---|---|---|
| `LoginTest` | UI | `smoke`,`regression`,`auth` | Valid login lands on dashboard as TESTER; invalid logins (data-driven from `invalid-logins.json`) are rejected with the right error; empty submit errors; nav to register works |
| `RegisterTest` | UI | `smoke`,`regression`,`auth` | New account registers + auto-signs-in; mismatched passwords, short password, missing name all rejected; nav back to login works |
| `DashboardTest` | UI | `smoke`,`dashboard` | A brand-new user's KPI cards render at 0 |
| `ProjectsTest` | UI | `smoke`,`regression`,`projects` | Project create (appears ACTIVE), delete (via the app's confirm dialog), open-detail |
| `EndToEndWorkflowTest` | UI/e2e | `smoke`,`e2e` | The whole product journey: register → project → suite → case → run → mark PASS → dashboard shows 1/1/100% |
| `AuthApiTest` | API | `api`,`smoke`,`regression` | Register returns tokens+TESTER role; standing-user login works; wrong password → 401; duplicate register → 400 |
| `ProjectApiTest` | API | `api`,`smoke`,`regression` | Project → suite → case graph builds over the API; delete works. One registered user per class |
| `ApiLoginDashboardTest` | Hybrid | `hybrid` | API-registered user + 2 API-seeded projects show up on the real dashboard |
| `ApiLoginExistingUserTest` | Hybrid | `hybrid`,`smoke` | Standing tester logs in via API, seeds a project via API, sees it in the UI, cleans up after itself |

### Suites (what each profile runs)

| Profile / suite XML | Contents | Parallelism | Typical duration* |
|---|---|---|---|
| `-Psmoke` → `smoke.xml` | `smoke` group across UI + API + the throttle-free hybrid test (9 tests) | 2 threads | ~1 min |
| `-Pui` → `ui.xml` | All pure-UI tests + E2E | 3 threads | ~3–4 min |
| `-Papi` → `api.xml` | All API tests (no browser) | 3 threads | ~20 s warm / ~2 min cold |
| `-Phybrid` → `hybrid.xml` | Both hybrid tests | serial | ~1 min |
| `-Pregression` → `regression.xml` (**default**) | UI (smoke+regression) + all API + hybrid (25 tests) | 3 threads | ~2 min warm |
| `-Pfull` → `full.xml` | Absolutely everything | 3 threads | ~3 min warm |

\* against the live deployment with services already awake; add ~60–90 s if
they were hibernating (the warm-up absorbs it).

---

## 4. Running from the command line (Maven)

Always run from **this** directory:

```bash
cd D:\AI-Testing\testHub\automation\testhub-automation
```

### 4.1 By suite (the normal way)

```bash
mvn test                    # default = regression (UI + API + hybrid)
mvn test -Psmoke            # fast all-layer confidence check
mvn test -Pui               # UI only
mvn test -Papi              # API only — no browser opens
mvn test -Phybrid           # the two API-assisted UI tests
mvn test -Pfull             # everything
```

### 4.2 Common flag combos

```bash
# Headless (no visible browser windows — same coverage)
mvn test -Psmoke -Dheadless=true

# Another browser
mvn test -Pui -Dbrowser=firefox
mvn test -Pui -Dbrowser=edge

# One reporter instead of both
mvn test -Pui -Dreport.type=extent      # or allure

# Fresh throwaway account per UI test instead of the standing tester
mvn test -Pui -Dreuse.user=false

# Disable the one automatic retry (see every raw failure)
mvn test -Pregression -Dretry.count=0
```

### 4.3 A single class or a single method

```bash
# One class (suite XML is bypassed automatically when -Dtest is used)
mvn test -Dtest=EndToEndWorkflowTest -Dheadless=true

# One method
mvn test -Dtest=LoginTest#shouldLoginWithValidCredentials

# Several classes
mvn test -Dtest=LoginTest,RegisterTest
```

> Note: with `-Dtest=...` the suite XML (and therefore the XML-registered
> `RetryTransformer`) is skipped — you get a raw single run with no retry,
> which is exactly what you want while debugging. The Extent/Allure listeners
> on the UI base class still fire.

### 4.4 A custom suite file

```bash
mvn test -DsuiteXmlFile=src/resources/suites/ui.xml
```

Any XML you drop into `src/resources/suites/` works the same way — copy an
existing one and edit the `<packages>`/`<groups>` to shape your own run.

### 4.5 Viewing the Allure report afterwards

```bash
mvn allure:serve      # builds the report and opens it in your browser
mvn allure:report     # static HTML into target/site/allure-maven-plugin/
```

---

## 5. Running in Eclipse

### 5.1 One-time setup

1. **Install the TestNG plugin** (needed for right-click runs):
   *Help → Eclipse Marketplace → search "TestNG for Eclipse" → Install → restart.*
2. **Import the project**:
   *File → Import → Maven → Existing Maven Projects →* browse to
   `D:\AI-Testing\testHub\automation\testhub-automation` → Finish.
3. Let the Maven build finish. The `build-helper-maven-plugin` registers the
   four domain folders (`src/common/java`, `src/api/java`, `src/ui/java`,
   `src/hybrid/java`) as source folders automatically — if they don't show as
   source folders, right-click the project → *Maven → Update Project…* (Alt+F5).

### 5.2 Run a whole suite

Right-click any suite file, e.g.
`src/resources/suites/smoke.xml` → **Run As → TestNG Suite**.

This is the closest IDE equivalent of `mvn test -Psmoke`: the XML brings the
listeners (Extent report + retry) with it.

### 5.3 Run one class / one method

- Right-click a test class (e.g. `LoginTest`) → **Run As → TestNG Test**.
- Or open the class, right-click a single `@Test` method name → **Run As → TestNG Test**.

### 5.4 Pass configuration flags in Eclipse

*Run → Run Configurations… → TestNG → (your configuration) → **Arguments** tab
→ **VM arguments***:

```
-Dheadless=true -Dbrowser=chrome -Dreuse.user=false
```

Any key from `config.properties` works here — VM arguments beat the file, same
as on the CLI.

Also on that dialog, keep the **working directory** at the default
(`${workspace_loc:testhub-automation}`) — the framework resolves
`config/`, `test-output/`, and `src/resources/testdata/` relative to it.

### 5.5 Debugging

Set breakpoints and use **Debug As → TestNG Test** instead. Handy trick: run
with `-Dheadless=false` (the default) and `-Dretry.count=0` so the browser is
visible and failures aren't retried while you step through.

---

## 6. Running in VS Code

### 6.1 One-time setup

1. Install the **Extension Pack for Java** (Microsoft) — brings language
   support, Maven integration, and the **Test Runner for Java** (which supports
   TestNG projects like this one).
2. *File → Open Folder…* → `D:\AI-Testing\testHub\automation\testhub-automation`
   (open the automation folder itself, not the whole repo — it keeps the Java
   tooling and working directory pointed at the right place).
3. Wait for "Java: Ready" in the status bar (first import downloads deps).

### 6.2 The recommended way: integrated terminal

VS Code's most reliable runner for this project is simply Maven in the
integrated terminal (`` Ctrl+` ``):

```bash
mvn test -Psmoke -Dheadless=true
mvn test -Dtest=LoginTest#shouldLoginWithValidCredentials
```

Everything from [section 4](#4-running-from-the-command-line-maven) applies verbatim.

### 6.3 Test Explorer (click-to-run)

With the Extension Pack installed, the **Testing** icon (beaker, left sidebar)
lists the TestNG classes — click ▶ next to a class or method to run/debug it.
To pass flags, add them to `.vscode/settings.json`:

```json
{
  "java.test.config": {
    "vmArgs": ["-Dheadless=true", "-Dretry.count=0"]
  }
}
```

### 6.4 Maven side panel

The **MAVEN** panel (Explorer sidebar, bottom) → `testhub-automation` →
*Lifecycle → test* runs the default suite; right-click *test → Execute with
arguments…* to add `-Psmoke -Dheadless=true` style flags.

---

## 7. Configuration

Single source of truth: [`src/resources/config/config.properties`](src/resources/config/config.properties).
**Resolution order (highest wins):** `-D` system property → OS env var
(`BASE_URL` style) → the properties file.

| Key | Default | Meaning |
|---|---|---|
| `base.url` | `https://mytesthub.vercel.app` | Frontend under test |
| `api.base.url` | `https://testhub-gateway.onrender.com` | Gateway for the API layer |
| `browser` | `chrome` | `chrome` \| `firefox` \| `edge` |
| `headless` | `false` | Headless runs force a 1920×1080 viewport (keeps the desktop sidebar visible) |
| `window.size` | `maximize` | Or explicit `1920x1080` |
| `timeout.explicit` | `40` s | Explicit-wait budget (generous for cold starts) |
| `timeout.pageload` | `60` s | Page-load budget |
| `wake.timeout.seconds` | `90` | Budget for the on-page "Wake services" flow |
| `reuse.user` | `true` | UI sign-in: standing tester (`true`) vs fresh registration per test (`false`) |
| `tester.email` / `tester.password` | standing account | Used by `reuse.user=true` and the API login tests |
| `admin.email` / `admin.password` | standing admin | For `loginAsAdmin()` flows |
| `report.type` | `both` | `extent` \| `allure` \| `both` |
| `screenshot.on.failure` | `true` | Embedded in the report |
| `screenshot.on.success` | `true` | Set `false` for faster, slimmer runs |
| `retry.count` | `1` | Automatic retries per failed test (`0` = off) |
| `warmup.enabled` | `true` | Pre-suite service wake-up; set `false` for local backends |
| `health.check.urls` | all three live `/health` URLs | What the warm-up polls (and thereby wakes) |

---

## 8. Reports, screenshots, and logs

| Artifact | Location | Notes |
|---|---|---|
| **ExtentReports HTML** | `test-output/reports/Latest/Report-<timestamp>_<user>.html` | Self-contained — just open it. Previous runs move to `test-output/reports/archive/` automatically |
| **Allure results** | `target/allure-results/` | View with `mvn allure:serve` |
| **Screenshots (PNG)** | `test-output/screenshots/` | Plus embedded copies inside both reports |
| **Framework log** | `test-output/logs/automation.log` | Log4j2; START/PASS/FAIL lines make grepping easy |
| **Surefire reports** | `target/surefire-reports/` | Raw TestNG/XML output — what CI parsers read |

---

## 9. Live vs local backend

**Live (default)** — zero setup, but remember the free tier *hibernates*:
the first contact wakes services (~25 s each) and Render's edge answers
**HTTP 429** for requests routed to a sleeping service. The framework handles
this itself (warm-up wakes all three services; `ApiClient` retries 429s;
UI tests use the login screen's wake button once per suite). If you probe
manually with Postman/curl first, hit all three `/health` URLs and you'll never
see a 429:

```
https://testhub-gateway.onrender.com/health
https://testhub-auth-service.onrender.com/health
https://testhub-core-service.onrender.com/health
```

**Local** — start the stack from the repo root (gateway `:3000`, frontend
`:5173`), then:

```bash
mvn test -Pui ^
  -Dbase.url=http://localhost:5173 ^
  -Dapi.base.url=http://localhost:3000 ^
  -Dwarmup.enabled=false
```

(`^` is the Windows cmd line-continuation; on bash use `\`.)
No hibernation, no throttle, fastest iteration loop.

---

## 10. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `HTTP 429 Too Many Requests` on register/login | A Render service was hibernating (`x-render-routing: hibernate-rate-limited`) | Let the built-in warm-up run (`warmup.enabled=true`); or curl the three `/health` URLs first; wait ~30 s and retry |
| First test of a run is very slow (~30 s+) | Free-tier cold start | Expected once per hibernation cycle; warm-up + generous waits absorb it |
| `config/config.properties not found on the classpath` | Test launched with the wrong **working directory** (IDE run config) | Set the run configuration's working directory to the project root (`testhub-automation/`) |
| Browser opens but sidebar/layout looks mobile in headless | Viewport too small | Already handled — headless forces `--window-size=1920,1080`. If you overrode `window.size`, keep width ≥ 1280 |
| `Unsupported browser 'xyz'` | Typo in `-Dbrowser` | One of `chrome` / `firefox` / `edge` |
| Tests pass alone but collide in parallel | Shared account + non-unique names | Use `TestDataFactory` names (all uniquified); don't hardcode entity names |
| Element not found right after a UI redesign | Locator drift | Prefer `data-testid` hooks; auth screens expose them (`login-email`, `register-submit`, …) — see `AuthPage`/`LoginPage`/`RegisterPage` for the pattern |
| No Extent report after an IDE single-class run | Listeners ride on the suite XML for API classes | Run via a suite XML (Eclipse: *Run As → TestNG Suite*) or via Maven when you need the full report |
| Want to see the raw failure without the automatic retry | `retry.count=1` masks one-off flakes | Add `-Dretry.count=0` |

---

*Verified green on 2026-07-09 against the live deployment:
API 7/7 · smoke 9/9 · full regression 25/25 — zero retries.*
