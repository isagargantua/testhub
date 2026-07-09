# 4. Database & Data Model

One **PostgreSQL** database, accessed through **Prisma**. Two schema files exist:

- `auth-service/prisma/schema.prisma` — just `User` + `UserRole`. auth-service
  runs only `prisma generate` (never `db push`), so it never reconciles the shared
  DB.
- `core-service/prisma/schema.prisma` — the full schema (mirrors `User`, plus all
  domain models). **core-service owns migrations** via `npm run deploy`
  (`prisma db push`).

IDs are **cuid** strings (`@default(cuid())`), not integers. Timestamps are
`createdAt`/`updatedAt` where present.

---

## 4.1 Entity relationship overview

```
User ──< Project ──< TestSuite ──< TestCase ──< TestResult >── TestRun >── Project
                                                                    
User ──< DumpItem            (file-storage vault, per-admin)

Ownership chain (drives all data isolation):
  Project.createdById = User.id
  TestSuite → Project          (a suite's owner = its project's owner)
  TestCase  → TestSuite → Project
  TestRun   → Project
  TestResult→ TestRun + TestCase
  DumpItem.uploadedById = User.id
```

A **TestResult** is the join between a **TestCase** and a **TestRun** — one row
per `(run, case)` pair, carrying the PASS/FAIL/SKIP/BLOCKED outcome.

---

## 4.2 Models, field by field

### `User`  (owned by auth-service; mirrored in core)
| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `email` | String | `@unique`, stored lowercased |
| `name` | String | |
| `passwordHash` | String | bcrypt hash, 10 rounds; never returned by the API |
| `role` | `UserRole` | default `TESTER`; first-ever user is forced to `ADMIN` |
| `createdAt` / `updatedAt` | DateTime | |

`enum UserRole { ADMIN, TESTER, VIEWER }` — note `VIEWER` exists in the enum but
**registration only ever assigns ADMIN or TESTER**, and there's no promote/demote
endpoint, so VIEWER is effectively unused today.

### `Project`
| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `name` | String | required on create |
| `description` | String? | optional |
| `status` | `ProjectStatus` | default `ACTIVE` |
| `createdById` | String | **the owner** — drives all isolation |
| `createdAt` / `updatedAt` | DateTime | |
| relations | `testSuites[]`, `testRuns[]` | |

`enum ProjectStatus { ACTIVE, ARCHIVED }`

### `TestSuite`
| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `name` | String | required |
| `description` | String? | |
| `projectId` | String | → `Project`, **`onDelete: Cascade`** |
| relations | `testCases[]` | |
| `createdAt` / `updatedAt` | DateTime | |

Deleting a project deletes its suites.

### `TestCase`
| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `title` | String | required |
| `description` | String? | |
| `steps` | String? | free text (newline-separated steps) |
| `expected` | String? | expected result |
| `priority` | `Priority` | default `MEDIUM` |
| `status` | `TestCaseStatus` | default `ACTIVE` |
| `tags` | String[] | array of labels |
| `suiteId` | String | → `TestSuite`, **`onDelete: Cascade`** |
| `createdById` | String | set to the creator |
| relations | `results[]` | |
| `createdAt` / `updatedAt` | DateTime | |

`enum Priority { LOW, MEDIUM, HIGH, CRITICAL }`
`enum TestCaseStatus { ACTIVE, DEPRECATED }`

### `TestRun`
| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `name` | String | required |
| `description` | String? | |
| `status` | `RunStatus` | default `IN_PROGRESS` |
| `selectedCaseIds` | String[] | default `[]`; the cases **in scope** for this run. If empty, the run implicitly covers *all* cases in the project's suites. |
| `projectId` | String | → `Project`, **`onDelete: Cascade`** |
| `createdById` | String | |
| relations | `results[]` | |
| `createdAt` / `updatedAt` | DateTime | |

`enum RunStatus { IN_PROGRESS, COMPLETED, ABORTED }`

> `selectedCaseIds` is a plain string array, **not** a foreign-key relation. The
> run view (`GET /api/runs/:id`) resolves these against the project's actual cases
> at read time, and synthesizes a `PENDING` row for any in-scope case without a
> recorded result.

### `TestResult`  (the case×run join)
| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `status` | `ResultStatus` | the recorded outcome |
| `comment` | String? | optional note |
| `testCaseId` | String | → `TestCase`, **`onDelete: Cascade`** |
| `runId` | String | → `TestRun`, **`onDelete: Cascade`** |
| `executedAt` | DateTime | default now |
| constraint | `@@unique([runId, testCaseId])` | **one result per case per run** → upsert key |

`enum ResultStatus { PASS, FAIL, SKIP, BLOCKED }`

> **`PENDING` is not a stored value.** It's a synthetic status the API emits for
> in-scope cases that have no `TestResult` yet (see `runs.js` and the run/export
> endpoints). The database only ever stores PASS/FAIL/SKIP/BLOCKED.

### `DumpItem`  (file-storage vault)
| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `filename` | String | original upload name |
| `mimeType` | String | reported content type |
| `sizeBytes` | Int | |
| `kind` | `DumpKind` | default `OTHER`; derived by `classify()` |
| `notes` | String? | optional label applied at upload |
| `content` | Bytes | **the raw file bytes (Postgres bytea)** |
| `uploadedById` | String | **the owner** (per-admin isolation) |
| `createdAt` | DateTime | |
| index | `@@index([createdAt])` | |

`enum DumpKind { TEXT, ARCHIVE, IMAGE, OTHER }`

---

## 4.3 Cascades & integrity

- **Delete a Project** → its `TestSuite`s, their `TestCase`s, the project's
  `TestRun`s, and all `TestResult`s tied to those cases/runs are removed (cascade
  chain through the FKs above).
- **Delete a TestSuite** → its `TestCase`s (and their results) go.
- **Delete a TestCase** → its `TestResult`s go.
- **Delete a TestRun** → its `TestResult`s go.
- `TestResult`'s `@@unique([runId, testCaseId])` is what makes
  `POST /api/runs/:id/results` an **upsert** (re-mark = update, never duplicate).

---

## 4.4 How isolation maps onto the schema

There is **no per-row `ownerId` on suites/cases/runs**. Instead, ownership is
derived by walking up to `Project.createdById`. The
`core-service/src/utils/ownership.js` helpers encode exactly these joins:

| Helper | Join it performs |
|---|---|
| `ownedProject` | `Project.createdById === userId` |
| `ownedSuite` | suite → `project.createdById === userId` |
| `ownedTestCase` | case → suite → `project.createdById === userId` |
| `ownedRun` | run → `project.createdById === userId` |

`DumpItem` is the exception: it has its own `uploadedById` and is scoped directly.

Next: [05-frontend.md](./05-frontend.md).
