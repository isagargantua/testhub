# testHub — The Build Story

> A first-person account of why I built testHub, what it taught me as a QA
> engineer and a "vibe coder," and the real problems I hit and solved along the
> way. Written so an interviewer can quickly see how I think.

## Why I built it

I wanted a **realistic, always-available target to practice test automation**
against — not a toy "todo app," but something with auth, roles, relationships,
pagination, and multiple services, like the products I actually test at work.
So I built testHub: a mini test-management platform (projects → suites → test
cases → runs → results) and then wrote full automation suites against it.

It became three things at once:
1. A **full-stack microservices app** I designed, built, and deployed.
2. A **test-automation playground** for API (RestAssured) and UI (Selenium &
   Playwright) practice.
3. A lesson in **operating software on real infrastructure** (free-tier Render +
   Vercel), where constraints force good engineering.

## How it sharpened me as a **tester**

Building the thing I test changed how I test. Owning both sides meant I designed
the API to be *testable*: predictable status codes, consistent JSON shapes,
pagination, and clear error contracts. When I later wrote the automation, I felt
every place where a sloppy contract makes tests flaky — and went back and fixed
the product. That feedback loop is the single most valuable thing I got out of it.

I also built **test management into the product itself** — runs scoped to selected
cases, PASS/FAIL/SKIP/BLOCKED results, a pass-rate dashboard — so I was thinking
about coverage and reporting from both the tool-builder's and the tool-user's
seat.

## How it sharpened me as a **"vibe coder"**

I drove a lot of the build conversationally — describing intent, reviewing
diffs, and insisting on "make it work and don't break anything else." That taught
me to **review generated code critically**: verifying changes actually compiled,
reading the real diff instead of trusting a summary, and adding guardrails
(syntax checks, builds, smoke runs) after every change. I learned to move fast
*and* keep a green build.

## API testing (RestAssured, Service Object Model)

I built a RestAssured framework using the **Service Object Model** with dedicated
**Jackson POJOs** for request/response (de)serialization. Highlights:
- One service object per API area; tests own the assertions and POJO mapping.
- A full **end-to-end flow test**: create project → suite → cases → a scoped run →
  submit a result → complete the run → export CSV *and* JSON → cascade-delete →
  assert the run 404s. That single test exercises the whole resource graph.
- **Negative and contract tests**: wrong password → 401, malformed email → 400,
  missing token → 401, and a regression test proving bad pagination params get
  *clamped* to 200 instead of 500-ing.

## UI testing (Selenium **and** Playwright, Page Object Model)

I implemented the **same UI scenarios twice** — once in Selenium 4, once in
Playwright for Java — so I could compare the two honestly. Both use a clean Page
Object Model, ThreadLocal driver/page management for parallel safety,
ExtentReports, screenshot-on-failure, and a retry analyzer. Practical lessons:
- Playwright **auto-dismisses dialogs** unless you register a handler — my delete
  test failed until I added `page.onDialog(Dialog::accept)`. Selenium needed an
  explicit `alertIsPresent` wait. Same feature, two very different gotchas.
- The app had **no `data-testid` hooks**, so I learned to write resilient locators
  from stable attributes and visible text — and noted where adding test ids would
  pay off.

## The hard problems (and how I solved them)

These are the war stories — each one taught me something.

### 1. "Too many login attempts" with correct credentials
Users (including me, on fresh devices and networks) kept getting locked out at
login. Root cause: requests arrive through a **3-hop proxy chain** (Render LB →
gateway → auth-service), so IP-based rate limiting collapsed *every* client into
one shared bucket. **Fix:** I made rate limiting **opt-in and off by default**,
and removed the env vars that could silently re-shrink the limits — making the
lockout *structurally impossible* unless explicitly enabled. Lesson: rate limiting
behind a proxy needs the *real* client IP, and a security control that only ever
hurts you should be off.

### 2. The cold-start "ping-pong"
On the free tier, each service sleeps independently after ~15 min and takes ~24s+
to wake. Symptom: fix login and the dashboard breaks; fix the dashboard and login
breaks — because waking one service left the others cold. **Fix (defense in
depth):** warm all services in parallel on app load and on tab refocus; a
transparent **axios retry** for any 5xx/timeout with backoff so a cold start
becomes "wait a moment, then it works"; and a scheduled **keep-warm GitHub
Action** kept inside the ~750 service-hours/month budget. Lesson: design for the
infrastructure you actually run on.

### 3. Random 500s under load → connection-pool exhaustion
Each route file was doing `new PrismaClient()`, so core-service alone opened ~5
connection pools and exhausted free-tier Postgres connections during cold-start
reconnects. **Fix:** a single shared Prisma client per service. Lesson: know how
your ORM manages connections — defaults aren't free.

### 4. Bad input crashing endpoints
`GET /projects?page=abc` produced a `NaN` offset and a 500. **Fix:** a
`parsePagination()` helper that clamps to safe positive integers, plus mapping
Prisma's "record not found" (`P2025`) to a proper **404** on update/delete instead
of a generic 500. I then wrote a regression test for the clamp. Lesson: validate
at the boundary, and turn every bug into a test.

### 5. Shipping a dark mode without breaking the light one
The UI had ~150 hard-coded colours across 15 files. Instead of risky edits
everywhere, I built dark mode as an **additive CSS layer** scoped to
`[data-theme="dark"]`, plus a pre-paint theme script to avoid a flash. Light mode
stayed **byte-for-byte identical**; dark mode just overrides on top. Lesson: the
safest refactor is often the one that adds rather than rewrites — and you verify
it by diffing the compiled output, not by eyeballing.

## What I'd do next (knowing the trade-offs)
- Add `data-testid` attributes to make UI automation rock-solid.
- Introduce per-record ownership/authorization in core-service.
- Code-split the frontend bundle (currently one ~660KB chunk).
- Add CI that runs the smoke suites against a preview deploy on every PR.

## The one-paragraph version (for an interview)
*"I built testHub, a microservices test-management platform (React + an Express
gateway proxying to auth and core services on Postgres), specifically so I'd have
a realistic target to automate. I wrote API tests in RestAssured (Service Object
Model with Jackson POJOs) and the same UI scenarios in both Selenium and
Playwright (Page Object Model). Running it on free-tier infra forced me to solve
real production problems — a proxy-induced rate-limit lockout, cascading cold
starts, Prisma connection-pool exhaustion, and input-validation crashes — and I
turned each fix into a regression test. Most recently I added a light/dark theme
as a purely additive CSS layer so it couldn't break the existing design."*
