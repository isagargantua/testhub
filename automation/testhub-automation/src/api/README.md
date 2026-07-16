# `api/` — the API layer (RestAssured)

Everything for talking to the testHub gateway **without a browser**.

| Package | What it does |
|---|---|
| `api/` | `ApiClient` — the RestAssured client (register, login, create project/suite/case/run, health/warm-up) |
| `api/models/` | Plain POJOs for (de)serializing request/response JSON (`AuthResponse`, `ProjectDto`, …) |
| `tests/api/` | Pure-API tests — hit the gateway directly and assert on the JSON |

This layer is **independent**: it never imports anything from `ui/`. The same
`ApiClient` is reused by the `hybrid/` tests to seed state fast.
