# Component: Automation Frameworks

**Path:** `automation/` · **Stack:** Java 17, Maven, TestNG

Three independent automation frameworks that test testHub. They double as the
project's reason for existing (a practice target) and as portfolio pieces.

## 1. `selenium-testhub/` — UI, Page Object Model
- Selenium 4.21 (Selenium Manager — no driver downloads), TestNG, ExtentReports,
  Log4j2.
- `DriverManager` (ThreadLocal), `DriverFactory` (chrome/firefox/edge, headless),
  `BasePage` + `LoginPage`/`DashboardPage`/`ProjectsPage`.
- Retry analyzer, screenshot-on-failure, service warm-up for cold starts.
- Scenarios: login (valid/invalid, data-driven), logout, dashboard cards,
  navigation, project create + delete (handles native confirm dialog).

## 2. `playwright-testhub/` — UI, Page Object Model
- Playwright for Java 1.44 (auto-downloads browsers), TestNG, ExtentReports.
- `PlaywrightFactory` (ThreadLocal Playwright/Browser/Context/Page),
  chromium/firefox/webkit.
- **Same scenarios as Selenium** so the two can be compared directly.
- Native `confirm()` on delete handled with `page.onDialog(Dialog::accept)`.

## 3. `restassured-testhub/` — API, Service Object Model + POJOs
- RestAssured 5.4, Jackson 2.17, Lombok, TestNG, ExtentReports.
- **Request/Response POJOs** for (de)serialization (`pojo/request`, `pojo/response`).
- **Service objects** per API area (`AuthService`, `ProjectService`, …) return
  RestAssured `Response`; tests own assertions + `response.as(Pojo.class)`.
- `SpecFactory` builds base/authorized specs; `BaseTest` logs in once and reuses
  the token; created data cleaned up in `@AfterClass`.
- Scenarios: auth (login/refresh/me/validation), project CRUD, **pagination
  clamping regression**, full end-to-end run flow (project→suite→cases→run→
  result→CSV/JSON export→cascade delete), dashboard stats.

## Common conventions
- `src/test/resources/config.properties` holds `ui.base.url` / `api.base.url` +
  admin credentials; every value is `-D` overridable.
- TestNG groups `smoke` and `regression`; `testng.xml` (full) and
  `testng-smoke.xml` (smoke) suites.
- All three warm the free-tier services before running and retry transient
  cold-start failures.

## Run
```bash
cd automation/<framework>
# edit src/test/resources/config.properties first (URLs + credentials)
mvn test                            # full regression
mvn test -Dsuite=testng-smoke.xml   # smoke
```
Reports: `reports/extent-report.html`. Each framework has its own README.
