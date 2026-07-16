# `framework/` — the reusable test engine

**No tests live here. Nothing here is testHub-specific.** This is the plumbing
every other layer builds on — you could lift this folder into a different
project and it would still make sense.

| Package | What it does |
|---|---|
| `config/` | `ConfigManager` — reads settings with `-D` > env var > `config.properties` precedence |
| `constants/` | Filesystem paths, app routes, localStorage keys |
| `driver/` | `DriverFactory` (builds the browser) + `DriverManager` (thread-safe holder for parallel runs) |
| `enums/` | `BrowserType`, `Priority`, `ResultStatus`, `RunStatus`, `Role` |
| `exceptions/` | `FrameworkException` — one clear failure type |
| `listeners/` | TestNG hooks: `TestListener` (reporting), `RetryAnalyzer` + `RetryTransformer` (auto-retry) |
| `reports/` | `ExtentManager` — thread-safe ExtentReports |
| `utils/` | Explicit waits, JS/alert helpers, screenshots, JSON/CSV/Excel readers, `TestDataFactory`, `XPathUtil` |
| `tests/data/` | `@DataProvider`s + their data POJOs (data-driven inputs) |

> Renamed from `common/` — "framework" says what it actually is.
