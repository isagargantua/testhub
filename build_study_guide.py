#!/usr/bin/env python3
"""
Generates a professional PDF study guide for the testHub Postman API project.
Run: python build_study_guide.py
Output: testHub_Postman_Study_Guide.pdf
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, NextPageTemplate, PageBreak, Flowable,
)
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
import html

# ---------------------------------------------------------------------------
# Palette
# ---------------------------------------------------------------------------
NAVY        = colors.HexColor("#1A1A2E")   # cover bg / dark accents
NAVY_SOFT   = colors.HexColor("#23233f")
ACCENT      = colors.HexColor("#E94560")   # accent red
INK         = colors.HexColor("#1d1d28")   # body text — solid, fully visible
INK_SOFT    = colors.HexColor("#2c2c3a")   # still-dark secondary
ORANGE      = colors.HexColor("#F08A24")   # tip box accent
ORANGE_BG   = colors.HexColor("#FDF1E2")   # tip box fill
ORANGE_BD   = colors.HexColor("#E8B57A")
CODE_BG     = colors.HexColor("#F2F3F5")   # code block bg (gray)
CODE_BD     = colors.HexColor("#CBD2D9")   # code block border
ROW_A       = colors.HexColor("#FFFFFF")
ROW_B       = colors.HexColor("#F4F5F8")   # alternating row
TBL_HEAD_BG = NAVY
HR_COLOR    = colors.HexColor("#D2D6E0")
WHITE       = colors.white

PAGE_W, PAGE_H = A4
MARGIN = 17 * mm
CONTENT_W = PAGE_W - 2 * MARGIN

# ---------------------------------------------------------------------------
# Styles
# ---------------------------------------------------------------------------
ss = getSampleStyleSheet()

def style(name, **kw):
    return ParagraphStyle(name, **kw)

S_LABEL   = style("label", fontName="Helvetica-Bold", fontSize=8.5, textColor=ACCENT,
                  spaceBefore=2, spaceAfter=3, leading=11, tracking=1)
S_H1      = style("h1", fontName="Helvetica-Bold", fontSize=18, textColor=NAVY,
                  spaceAfter=8, leading=22)
S_H2      = style("h2", fontName="Helvetica-Bold", fontSize=13, textColor=NAVY,
                  spaceBefore=10, spaceAfter=5, leading=16)
S_H3      = style("h3", fontName="Helvetica-Bold", fontSize=11, textColor=ACCENT,
                  spaceBefore=8, spaceAfter=3, leading=14)
S_BODY    = style("body", fontName="Helvetica", fontSize=10, textColor=INK,
                  leading=15, spaceAfter=6, alignment=TA_LEFT)
S_BULLET  = style("bullet", fontName="Helvetica", fontSize=10, textColor=INK,
                  leading=14.5, spaceAfter=3, leftIndent=12, bulletIndent=2)
S_CODE    = style("code", fontName="Courier", fontSize=8.3, textColor=INK,
                  leading=11.5)
S_TBL     = style("tbl", fontName="Helvetica", fontSize=8.6, textColor=INK, leading=11.5)
S_TBL_B   = style("tblb", fontName="Helvetica-Bold", fontSize=8.6, textColor=INK, leading=11.5)
S_TBL_HEAD= style("tblh", fontName="Helvetica-Bold", fontSize=8.8, textColor=WHITE, leading=11.5)
S_TIP     = style("tip", fontName="Helvetica", fontSize=9.3, textColor=INK, leading=13.5)
S_TIP_H   = style("tiph", fontName="Helvetica-Bold", fontSize=9.5, textColor=colors.HexColor("#B5651D"), leading=13)
S_COVER_T = style("ct", fontName="Helvetica-Bold", fontSize=34, textColor=WHITE,
                  leading=38, alignment=TA_LEFT)
S_COVER_S = style("cs", fontName="Helvetica", fontSize=13, textColor=colors.HexColor("#C9CCE0"),
                  leading=19, alignment=TA_LEFT)
S_COVER_K = style("ck", fontName="Helvetica-Bold", fontSize=10, textColor=ACCENT,
                  leading=14, alignment=TA_LEFT, tracking=2)
S_TOC_NUM = style("tnum", fontName="Helvetica-Bold", fontSize=10, textColor=ACCENT, leading=14)
S_TOC_TIT = style("ttit", fontName="Helvetica", fontSize=10, textColor=INK, leading=14)


def esc(t):
    return html.escape(str(t))


# ---------------------------------------------------------------------------
# Custom flowables
# ---------------------------------------------------------------------------
class CodeBlock(Flowable):
    """Gray background code block, Courier, light border, wraps lines."""
    def __init__(self, code, width):
        super().__init__()
        self.code = code.rstrip("\n").split("\n")
        self.width = width
        self.pad = 7
        self.lh = 11.5
        self.fs = 8.3

    def wrap(self, availW, availH):
        self.width = min(self.width, availW)
        self.height = len(self.code) * self.lh + 2 * self.pad
        return self.width, self.height

    def draw(self):
        c = self.canv
        c.setFillColor(CODE_BG)
        c.setStrokeColor(CODE_BD)
        c.setLineWidth(0.7)
        c.roundRect(0, 0, self.width, self.height, 4, fill=1, stroke=1)
        c.setFont("Courier", self.fs)
        c.setFillColor(INK)
        y = self.height - self.pad - self.fs
        for line in self.code:
            c.drawString(self.pad, y, line.replace("\t", "    "))
            y -= self.lh


def hr():
    return HRFlowable(width="100%", thickness=0.8, color=HR_COLOR,
                      spaceBefore=9, spaceAfter=9)


def tip_box(title, body_lines, doc_width=CONTENT_W):
    """Orange tip box for interview tips / important notes."""
    inner = []
    inner.append(Paragraph("&#9888;&nbsp; " + esc(title), S_TIP_H))
    for ln in body_lines:
        inner.append(Paragraph(ln, S_TIP))
    t = Table([[inner]], colWidths=[doc_width])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), ORANGE_BG),
        ("BOX", (0, 0), (-1, -1), 1.1, ORANGE),
        ("LINEBEFORE", (0, 0), (0, -1), 3.5, ORANGE),
        ("LEFTPADDING", (0, 0), (-1, -1), 11),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t


def data_table(headers, rows, col_widths):
    """Styled table: dark header row, alternating row colors, dark text."""
    data = [[Paragraph(esc(h), S_TBL_HEAD) for h in headers]]
    for r in rows:
        data.append([Paragraph(c if "<" in str(c) else esc(c), S_TBL) for c in r])
    t = Table(data, colWidths=col_widths, repeatRows=1)
    sty = [
        ("BACKGROUND", (0, 0), (-1, 0), TBL_HEAD_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D8DCE6")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
    ]
    for i in range(1, len(data)):
        sty.append(("BACKGROUND", (0, i), (-1, i), ROW_A if i % 2 else ROW_B))
    t.setStyle(TableStyle(sty))
    return t


def section_label(n):
    return Paragraph(f"SECTION&nbsp;{n:02d}", S_LABEL)


def b(text):
    return Paragraph(text, S_BODY)


def bullet(text):
    return Paragraph(f"<bullet>&#8226;</bullet>{text}", S_BULLET)


# ---------------------------------------------------------------------------
# Document with cover + content templates, footer page numbers
# ---------------------------------------------------------------------------
class Guide(BaseDocTemplate):
    def __init__(self, path):
        super().__init__(path, pagesize=A4,
                         leftMargin=MARGIN, rightMargin=MARGIN,
                         topMargin=MARGIN, bottomMargin=18 * mm,
                         title="testHub Postman API Study Guide",
                         author="testHub")
        content_frame = Frame(MARGIN, 18 * mm,
                              PAGE_W - 2 * MARGIN, PAGE_H - MARGIN - 18 * mm,
                              id="content")
        cover_frame = Frame(0, 0, PAGE_W, PAGE_H, id="cover",
                            leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        self.addPageTemplates([
            PageTemplate(id="cover", frames=[cover_frame], onPage=self._cover_bg),
            PageTemplate(id="content", frames=[content_frame], onPage=self._footer),
        ])

    def _cover_bg(self, canv, doc):
        canv.saveState()
        canv.setFillColor(NAVY)
        canv.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
        # accent bars
        canv.setFillColor(ACCENT)
        canv.rect(MARGIN, PAGE_H - 150 * mm, 60 * mm, 2.4, fill=1, stroke=0)
        canv.setFillColor(colors.HexColor("#2c2c4a"))
        canv.rect(0, 24 * mm, PAGE_W, 0.8, fill=1, stroke=0)
        canv.restoreState()

    def _footer(self, canv, doc):
        canv.saveState()
        canv.setStrokeColor(HR_COLOR)
        canv.setLineWidth(0.6)
        canv.line(MARGIN, 14 * mm, PAGE_W - MARGIN, 14 * mm)
        canv.setFont("Helvetica", 8)
        canv.setFillColor(colors.HexColor("#6b6b7b"))
        canv.drawString(MARGIN, 9.5 * mm, "testHub — Postman API Testing Study Guide")
        canv.drawRightString(PAGE_W - MARGIN, 9.5 * mm, f"Page {doc.page - 1}")
        canv.restoreState()


# ---------------------------------------------------------------------------
# Build story
# ---------------------------------------------------------------------------
def build():
    story = []
    CW = PAGE_W - 2 * MARGIN  # content width

    # ---------- COVER ----------
    story.append(Spacer(1, 78 * mm))
    cover_tbl = Table([[Paragraph("API TESTING · POSTMAN · QA AUTOMATION", S_COVER_K)],
                       [Spacer(1, 8)],
                       [Paragraph("testHub Postman<br/>API Study Guide", S_COVER_T)],
                       [Spacer(1, 10)],
                       [Paragraph("A complete, hands-on reference — from microservices "
                                  "architecture to environments, variables, auth flows, "
                                  "pre-request &amp; test scripts, and the full request "
                                  "catalogue of the testHub API collection.", S_COVER_S)]],
                      colWidths=[PAGE_W - 2 * MARGIN])
    cover_tbl.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), MARGIN),
        ("RIGHTPADDING", (0, 0), (-1, -1), MARGIN),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(cover_tbl)
    story.append(Spacer(1, 60 * mm))
    foot = Table([[Paragraph('<font color="#E94560"><b>Practice project:</b></font> '
                             '<font color="#C9CCE0">testHub — a microservices test-management '
                             'platform used as a target for API &amp; UI automation practice.</font>',
                             style("cf", fontName="Helvetica", fontSize=10, leading=15))]],
                 colWidths=[PAGE_W - 2 * MARGIN])
    foot.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), MARGIN),
                              ("RIGHTPADDING", (0, 0), (-1, -1), MARGIN)]))
    story.append(foot)

    story.append(NextPageTemplate("content"))
    story.append(PageBreak())

    # ---------- TABLE OF CONTENTS ----------
    story.append(Paragraph("Table of Contents", S_H1))
    story.append(hr())
    toc = [
        ("01", "Overview — What This Project Teaches"),
        ("02", "System Architecture (What You're Testing)"),
        ("03", "Postman Setup: Workspace, Environments & Variables"),
        ("04", "Authentication & the JWT Lifecycle"),
        ("05", "The Auto-Refresh Interceptor (Collection Pre-request)"),
        ("06", "Pre-request Scripts — Dynamic Data & Seeding"),
        ("07", "Test Scripts & Assertions (pm.test / chai)"),
        ("08", "Variable Chaining — The End-to-End Workflow"),
        ("09", "Request Catalogue: Health & Auth"),
        ("10", "Request Catalogue: Admin Users"),
        ("11", "Request Catalogue: Projects"),
        ("12", "Request Catalogue: Suites & Test Cases"),
        ("13", "Request Catalogue: Runs & Results"),
        ("14", "Request Catalogue: Dashboard"),
        ("15", "Negative Testing & Status Codes"),
        ("16", "Running at Scale: Collection Runner & Newman"),
        ("17", "Best Practices & Interview Cheat-Sheet"),
    ]
    rows = [[Paragraph(n, S_TOC_NUM), Paragraph(t, S_TOC_TIT)] for n, t in toc]
    tt = Table(rows, colWidths=[18 * mm, CW - 18 * mm])
    sty = [("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
           ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
           ("LINEBELOW", (0, 0), (-1, -1), 0.4, HR_COLOR),
           ("LEFTPADDING", (0, 0), (0, -1), 2)]
    tt.setStyle(TableStyle(sty))
    story.append(tt)
    story.append(hr())

    # ====================================================================
    # SECTION 01 — Overview
    # ====================================================================
    story.append(section_label(1))
    story.append(Paragraph("Overview — What This Project Teaches", S_H1))
    story.append(b("This collection was built to <b>practise real-world API testing</b> against "
                   "<b>testHub</b>, a small but realistic test-management platform (think a mini "
                   "TestRail). Rather than hitting a toy endpoint, you exercise a full product: "
                   "authentication with JWTs, role-based access, paginated lists, nested resources, "
                   "and aggregated dashboard stats — the same shapes you meet on the job."))
    story.append(Paragraph("Skills demonstrated end-to-end", S_H3))
    for x in [
        "Designing a <b>layered collection</b> (folders per resource) that mirrors the API.",
        "<b>Environments</b> (Production vs Local) and the difference between collection and environment variables.",
        "<b>Auth flows</b>: register, login, <b>access + refresh tokens</b>, Bearer auth, logout/blacklist.",
        "<b>Pre-request scripts</b>: generating unique dynamic data and seeding state with <font face='Courier'>pm.sendRequest</font>.",
        "<b>Test scripts</b>: status, schema, value and response-time assertions with chai-style <font face='Courier'>pm.expect</font>.",
        "<b>Variable chaining</b>: capturing IDs from one response to drive the next request.",
        "<b>Negative testing</b>: asserting 400/401/403/404 paths, not just happy paths.",
        "A reusable <b>JWT auto-refresh interceptor</b> at collection scope.",
    ]:
        story.append(bullet(x))
    story.append(tip_box("Interview tip",
        ["When asked &#8220;how do you structure a Postman collection?&#8221; describe exactly this: "
         "one folder per resource, requests ordered to form an end-to-end flow, IDs chained through "
         "variables, and both positive and negative cases for every endpoint."]))
    story.append(hr())

    # ====================================================================
    # SECTION 02 — Architecture
    # ====================================================================
    story.append(section_label(2))
    story.append(Paragraph("System Architecture (What You're Testing)", S_H1))
    story.append(b("testHub is a <b>microservices</b> app. Every API call goes through a single "
                   "<b>gateway</b>, which proxies to two backend services sharing one PostgreSQL "
                   "database. You almost always test through the gateway (<font face='Courier'>baseUrl</font>); "
                   "the per-service URLs exist mainly to wake or health-check each container."))
    story.append(CodeBlock(
        "Client (Postman / React SPA)\n"
        "        |  HTTPS  (Authorization: Bearer <accessToken>)\n"
        "        v\n"
        "   [ API GATEWAY ]   https://testhub-gateway.onrender.com\n"
        "    | proxies by path prefix\n"
        "    |---- /api/auth/*        -> AUTH SERVICE  (:3001)\n"
        "    |---- /api/projects      -> CORE SERVICE  (:3002)\n"
        "    |---- /api/suites        -> CORE SERVICE\n"
        "    |---- /api/testcases     -> CORE SERVICE\n"
        "    |---- /api/runs          -> CORE SERVICE\n"
        "    '---- /api/dashboard     -> CORE SERVICE\n"
        "                 |                  |\n"
        "                 v                  v\n"
        "            PostgreSQL  (User)   PostgreSQL (Project/Suite/Case/Run/Result)",
        CW))
    story.append(Paragraph("The three services", S_H3))
    story.append(data_table(
        ["Service", "Owns", "Key responsibility"],
        [["Gateway", "Routing, CORS", "Single public entry; proxies by path; serves /health and /docs."],
         ["auth-service", "User table", "Register, login, JWT issue/verify, refresh, logout, admin user mgmt."],
         ["core-service", "Projects -> Results", "Projects, suites, test cases, runs, results, dashboard stats."]],
        [30 * mm, 32 * mm, CW - 62 * mm]))
    story.append(Spacer(1, 5))
    story.append(b("<b>Data model (hierarchy):</b> a Project contains Suites; a Suite contains Test "
                   "Cases; a Run belongs to a Project and produces Results (one per test case, "
                   "PASS/FAIL/SKIP/BLOCKED). Deleting a project <b>cascades</b> to everything under it."))
    story.append(tip_box("Important note — free-tier cold starts",
        ["The services sleep after ~15 min idle and take ~24-60s to wake. That's why the collection "
         "has <b>Health / Warm-up</b> requests and the tests allow response times up to 60s. Always "
         "warm up before a run."]))
    story.append(hr())

    # ====================================================================
    # SECTION 03 — Environments & Variables
    # ====================================================================
    story.append(section_label(3))
    story.append(Paragraph("Postman Setup: Workspace, Environments & Variables", S_H1))
    story.append(b("The project ships <b>two environments</b> so the same requests run against the "
                   "deployed app or a local stack with a one-click switch — you never edit a request "
                   "to change targets."))
    story.append(data_table(
        ["Variable", "Production", "Local"],
        [["baseUrl", "https://testhub-gateway.onrender.com", "http://localhost:3000"],
         ["authServiceUrl", "https://testhub-auth-service.onrender.com", "http://localhost:3001"],
         ["coreServiceUrl", "https://testhub-core-service.onrender.com", "http://localhost:3002"],
         ["adminEmail / adminPassword", "your admin login", "local admin login"],
         ["accessToken / refreshToken", "(set at login)", "(set at login)"]],
        [44 * mm, CW - 44 * mm - 32 * mm, 32 * mm]))
    story.append(Paragraph("Collection variables vs Environment variables", S_H3))
    story.append(data_table(
        ["Scope", "Lives in", "Use it for"],
        [["Collection", "The collection itself", "Defaults shared by everyone (baseUrl fallback, projectId chaining)."],
         ["Environment", "The active environment", "Per-target values & secrets: URLs, credentials, live tokens."],
         ["Local (pm.variables)", "Single request run", "Throwaway values from a pre-request script (e.g. a unique email)."]],
        [34 * mm, 42 * mm, CW - 76 * mm]))
    story.append(Spacer(1, 5))
    story.append(b("Precedence (narrowest wins): <b>Local &gt; Environment &gt; Collection &gt; Global</b>. "
                   "The collection deliberately writes live tokens to the <b>environment</b> scope so a "
                   "shared collection default never gets polluted with one machine's session."))
    story.append(tip_box("Interview tip",
        ["Know the resolution order cold. A classic question: &#8220;a variable has different values in "
         "the environment and the collection — which wins?&#8221; Answer: the <b>environment</b> "
         "(narrower scope) overrides the collection default."]))
    story.append(hr())

    # ====================================================================
    # SECTION 04 — Auth & JWT
    # ====================================================================
    story.append(section_label(4))
    story.append(Paragraph("Authentication & the JWT Lifecycle", S_H1))
    story.append(b("testHub uses <b>JWT</b> bearer auth. Login returns two tokens: a short-lived "
                   "<b>access token</b> (~8h) sent on every protected call, and a long-lived "
                   "<b>refresh token</b> (~30d) used only to mint a new access token. The collection "
                   "sets auth <b>once at the collection level</b> so every request inherits it:"))
    story.append(CodeBlock(
        '// Collection > Authorization\n'
        'Type:  Bearer Token\n'
        'Token: {{accessToken}}\n\n'
        '// Login response (POST /api/auth/login) saved by the test script:\n'
        'pm.environment.set("accessToken",  body.accessToken);\n'
        'pm.environment.set("refreshToken", body.refreshToken);\n'
        'pm.environment.set("adminUserId",  body.user.id);', CW))
    story.append(Paragraph("The flow in order", S_H3))
    for x in [
        "<b>Register</b> &#8594; first user becomes <font face='Courier'>ADMIN</font>, everyone after is <font face='Courier'>TESTER</font> (role is server-decided, never trust the client).",
        "<b>Login</b> &#8594; receive user + accessToken + refreshToken; persist tokens.",
        "<b>Protected calls</b> &#8594; gateway forwards <font face='Courier'>Bearer accessToken</font>; each service verifies it locally.",
        "<b>Refresh</b> &#8594; when the access token nears expiry, POST the refresh token for a fresh access token.",
        "<b>Logout</b> &#8594; token is blacklisted (Redis) and the client clears its stored tokens.",
    ]:
        story.append(bullet(x))
    story.append(tip_box("Interview tip — why two tokens?",
        ["Short access tokens limit the blast radius if one leaks; the refresh token lets users stay "
         "logged in without re-entering credentials. You revoke at logout by blacklisting. Be ready to "
         "explain access-vs-refresh in one sentence each."]))
    story.append(hr())

    # ====================================================================
    # SECTION 05 — Auto-refresh interceptor
    # ====================================================================
    story.append(section_label(5))
    story.append(Paragraph("The Auto-Refresh Interceptor (Collection Pre-request)", S_H1))
    story.append(b("A standout technique in this collection: a <b>collection-level pre-request "
                   "script</b> runs before <i>every</i> request, decodes the JWT, and silently "
                   "refreshes it if it expires within 60 seconds. This keeps long Collection-Runner "
                   "sessions authenticated with zero manual steps."))
    story.append(CodeBlock(
        '// Collection > Pre-request Script (runs before every request)\n'
        'const token = pm.environment.get("accessToken");\n'
        'if (token) {\n'
        '  const [, payloadB64] = token.split(".");\n'
        '  const payload = JSON.parse(atob(payloadB64));   // decode JWT\n'
        '  const msLeft  = payload.exp * 1000 - Date.now();\n'
        '  if (msLeft < 60000) {                            // < 60s to expiry\n'
        '    pm.sendRequest({\n'
        '      url: pm.environment.get("baseUrl") + "/api/auth/refresh",\n'
        '      method: "POST",\n'
        '      header: { "Content-Type": "application/json" },\n'
        '      body: { mode: "raw",\n'
        '              raw: JSON.stringify({ refreshToken:\n'
        '                    pm.environment.get("refreshToken") }) }\n'
        '    }, (err, res) => {\n'
        '      if (!err && res.code === 200)\n'
        '        pm.environment.set("accessToken", res.json().accessToken);\n'
        '    });\n'
        '  }\n'
        '}', CW))
    story.append(b("Key ideas: <font face='Courier'>atob</font> base64-decodes the JWT payload to read "
                   "<font face='Courier'>exp</font>; <font face='Courier'>pm.sendRequest</font> fires an "
                   "out-of-band call; the fresh token is written back to the <b>environment</b> so the "
                   "real request that follows uses it."))
    story.append(tip_box("Interview tip",
        ["This is a great &#8220;show, don't tell&#8221; answer to &#8220;how do you handle token expiry in "
         "automated runs?&#8221; — a pre-request interceptor that refreshes proactively beats letting "
         "requests fail with 401 and retrying."]))
    story.append(hr())

    # ====================================================================
    # SECTION 06 — Pre-request scripts
    # ====================================================================
    story.append(section_label(6))
    story.append(Paragraph("Pre-request Scripts — Dynamic Data & Seeding", S_H1))
    story.append(b("Re-runnable tests must not collide on unique fields like email. The "
                   "<b>Register</b> request generates fresh credentials every run using a timestamp:"))
    story.append(CodeBlock(
        'const t = Date.now();\n'
        'pm.environment.set("testerEmail",    `qa.admin.${t}@testhub.local`);\n'
        'pm.environment.set("testerPassword", `SecureAdmin!${t}`);', CW))
    story.append(b("The <b>[Error] Register - Already Exists</b> request goes further — it <b>seeds "
                   "state first</b>: a pre-request script registers a user via "
                   "<font face='Courier'>pm.sendRequest</font>, so the main request can then prove a "
                   "<b>duplicate</b> is rejected with 400. This makes the negative test fully "
                   "self-contained and deterministic."))
    story.append(tip_box("Best practice",
        ["Tests should be <b>idempotent and independent</b>: generate unique data, seed any "
         "preconditions in the pre-request step, and clean up in the test step. Never depend on data a "
         "previous manual run left behind."]))
    story.append(hr())

    # ====================================================================
    # SECTION 07 — Test scripts & assertions
    # ====================================================================
    story.append(section_label(7))
    story.append(Paragraph("Test Scripts & Assertions (pm.test / chai)", S_H1))
    story.append(b("Post-response <b>test scripts</b> turn a request into an automated check. The "
                   "collection asserts four things consistently: status code, response schema (keys), "
                   "specific values, and (for warm-ups) response time."))
    story.append(CodeBlock(
        'pm.test("Status 200 OK", () => pm.response.to.have.status(200));\n\n'
        'pm.test("Response shape is correct", () => {\n'
        '  const body = pm.response.json();\n'
        '  pm.expect(body).to.have.all.keys(\n'
        '       "user", "accessToken", "refreshToken");\n'
        '  pm.expect(body.user.role).to.eql("ADMIN");\n'
        '  pm.expect(body.accessToken).to.be.a("string").and.not.empty;\n'
        '});\n\n'
        '// chain: capture an id for the next request\n'
        'pm.collectionVariables.set("projectId", pm.response.json().id);', CW))
    story.append(data_table(
        ["Assertion", "What it proves"],
        [["pm.response.to.have.status(201)", "Correct HTTP status code."],
         ["to.have.all.keys(...)", "Response has exactly the expected fields (contract / schema)."],
         ["expect(x).to.eql(y)", "A specific value matches (role, status, message)."],
         ["expect(arr).to.be.an('array')", "Type checks on lists and objects."],
         ["expect(p).to.be.within(0,100)", "Range checks (e.g. passRatePercent)."],
         ["responseTime).to.be.below(60000)", "Performance budget (cold-start tolerant)."]],
        [70 * mm, CW - 70 * mm]))
    story.append(tip_box("Interview tip",
        ["&#8220;What do you assert on an API response?&#8221; &#8594; status code, body schema, key "
         "values, headers/content-type, and response time. Bonus: mention asserting the <b>error "
         "contract</b> on negative cases, which this collection does."]))
    story.append(hr())

    # ====================================================================
    # SECTION 08 — Variable chaining workflow
    # ====================================================================
    story.append(section_label(8))
    story.append(Paragraph("Variable Chaining — The End-to-End Workflow", S_H1))
    story.append(b("Resources are nested, so each create request <b>saves its id</b> and later "
                   "requests consume it. Running the folders in order produces a complete lifecycle:"))
    story.append(CodeBlock(
        'Login            -> accessToken, refreshToken     (environment)\n'
        'Create Project   -> projectId                     (collection)\n'
        'Create Suite     -> suiteId      (uses projectId)\n'
        'Create Test Case -> testCaseId   (uses suiteId)\n'
        'Create Run       -> runId        (uses projectId)\n'
        'Submit Result    -> uses runId + testCaseId\n'
        'Update Run        -> status COMPLETED\n'
        'Dashboard Stats  -> aggregates everything above\n'
        'Delete Project   -> cascade cleanup; clears ids', CW))
    story.append(b("<b>Recommended run order:</b> Health &#8594; Auth &#8594; Projects &#8594; Suites "
                   "&#8594; Test Cases &#8594; Runs &#8594; Dashboard. The same ordering is what the "
                   "Collection Runner / Newman replays in CI."))
    story.append(tip_box("Important note",
        ["A result's <font face='Courier'>testCaseId</font> must belong to the <b>same project</b> as the "
         "run. Chaining the ids from the create steps guarantees this; pasting a random id will 400/404."]))
    story.append(hr())

    # ====================================================================
    # SECTION 09 — Health & Auth catalogue
    # ====================================================================
    story.append(section_label(9))
    story.append(Paragraph("Request Catalogue: Health & Auth", S_H1))
    story.append(Paragraph("Health Check (warm-up)", S_H3))
    story.append(data_table(
        ["Request", "Method & Path", "Asserts"],
        [["Gateway Health", "GET {{baseUrl}}/health", "200, status 'ok', time < 60s"],
         ["Auth Health", "GET {{authServiceUrl}}/health", "200, status 'ok'"],
         ["Core Health", "GET {{coreServiceUrl}}/health", "200, status 'ok'"]],
        [34 * mm, 60 * mm, CW - 94 * mm]))
    story.append(Paragraph("Auth", S_H3))
    story.append(data_table(
        ["Request", "Method & Path", "Notes"],
        [["Register (New User)", "POST /api/auth/register", "Dynamic email; expects 201, role TESTER."],
         ["Login - Admin", "POST /api/auth/login", "Saves admin tokens; expects role ADMIN."],
         ["Login - New User", "POST /api/auth/login", "Tester login; saves session tokens."],
         ["Get Me", "GET /api/auth/me", "Current profile from Bearer token."],
         ["Refresh Token", "POST /api/auth/refresh", "New accessToken from refreshToken."],
         ["Logout", "POST /api/auth/logout", "Blacklists token; clears stored tokens."],
         ["Re-Login After Logout", "POST /api/auth/login", "Restores a valid session."]],
        [40 * mm, 52 * mm, CW - 92 * mm]))
    story.append(hr())

    # ====================================================================
    # SECTION 10 — Admin users
    # ====================================================================
    story.append(section_label(10))
    story.append(Paragraph("Request Catalogue: Admin Users", S_H1))
    story.append(b("ADMIN-only endpoints — they require the <b>admin</b> access token. The list "
                   "request captures the first TESTER's id into <font face='Courier'>targetUserId</font> "
                   "to drive reset/delete."))
    story.append(data_table(
        ["Request", "Method & Path", "Asserts / Behaviour"],
        [["List All Users", "GET /api/auth/users?page=1&limit=10", "200; items + pagination; saves targetUserId."],
         ["Search Users", "GET /api/auth/users?search=...", "200; filtered items array."],
         ["Reset Password", "PATCH /api/auth/users/{{targetUserId}}/reset-password", "200; 'Password reset successfully'."],
         ["Delete User", "DELETE /api/auth/users/{{targetUserId}}", "200; can't delete self / last admin."],
         ["[Error] List as Tester", "GET /api/auth/users", "401/403 — role guard rejects TESTER."]],
        [34 * mm, 64 * mm, CW - 98 * mm]))
    story.append(tip_box("Interview tip — RBAC",
        ["Role-based access control is tested by sending a <b>TESTER</b> token to an <b>ADMIN</b> "
         "endpoint and asserting 403 Forbidden. Always test the <i>negative</i> authorization path, "
         "not just that admins succeed."]))
    story.append(hr())

    # ====================================================================
    # SECTION 11 — Projects
    # ====================================================================
    story.append(section_label(11))
    story.append(Paragraph("Request Catalogue: Projects", S_H1))
    story.append(data_table(
        ["Request", "Method & Path", "Asserts / Behaviour"],
        [["Create Project", "POST /api/projects", "201; status ACTIVE; saves projectId."],
         ["List Projects", "GET /api/projects?page&limit", "200; items + numeric pagination."],
         ["Get Project by ID", "GET /api/projects/{{projectId}}", "200; correct record; valid status."],
         ["Update Project", "PUT /api/projects/{{projectId}}", "200; new name/description."],
         ["Archive Project", "PUT /api/projects/{{projectId}}", "200; status ARCHIVED."],
         ["[Error] Not Found", "GET /api/projects/<bad-id>", "404; error message present."],
         ["Delete Project", "DELETE /api/projects/{{projectId}}", "200; cascades; clears ids."]],
        [36 * mm, 60 * mm, CW - 96 * mm]))
    story.append(b("Projects are the top of the hierarchy and the ownership anchor — suites, cases and "
                   "runs all hang off a project, and deleting one cascades to all of them."))
    story.append(hr())

    # ====================================================================
    # SECTION 12 — Suites & Test cases
    # ====================================================================
    story.append(section_label(12))
    story.append(Paragraph("Request Catalogue: Suites & Test Cases", S_H1))
    story.append(Paragraph("Suites (scoped to a project)", S_H3))
    story.append(data_table(
        ["Request", "Method & Path", "Asserts"],
        [["Create Suite", "POST /api/suites/project/{{projectId}}", "201; saves suiteId."],
         ["List Suites", "GET /api/suites/project/{{projectId}}", "200; array of suites."],
         ["Update Suite", "PUT /api/suites/{{suiteId}}", "200; new name."],
         ["Delete Suite", "DELETE /api/suites/{{suiteId}}", "200; cascades to its cases."]],
        [32 * mm, 68 * mm, CW - 100 * mm]))
    story.append(Paragraph("Test Cases (scoped to a suite)", S_H3))
    story.append(data_table(
        ["Request", "Method & Path", "Asserts"],
        [["Create Test Case", "POST /api/testcases/suite/{{suiteId}}", "201; priority HIGH; saves testCaseId."],
         ["Create (Low Priority)", "POST /api/testcases/suite/{{suiteId}}", "201; priority LOW; empty tags."],
         ["List by Suite", "GET /api/testcases/suite/{{suiteId}}", "200; items + pagination."],
         ["Update Test Case", "PUT /api/testcases/{{testCaseId}}", "200; priority CRITICAL."],
         ["Deprecate", "PUT /api/testcases/{{testCaseId}}", "200; status DEPRECATED."],
         ["[Error] Missing title", "POST /api/testcases/suite/{{suiteId}}", "400; validation errors[]."],
         ["Delete Test Case", "DELETE /api/testcases/{{testCaseId}}", "200; success message."]],
        [38 * mm, 62 * mm, CW - 100 * mm]))
    story.append(b("Priority values: <font face='Courier'>LOW, MEDIUM, HIGH, CRITICAL</font>. "
                   "Status values: <font face='Courier'>ACTIVE, DEPRECATED</font>. Note there is no "
                   "GET-by-id for suites or cases — you list by parent."))
    story.append(hr())

    # ====================================================================
    # SECTION 13 — Runs & Results
    # ====================================================================
    story.append(section_label(13))
    story.append(Paragraph("Request Catalogue: Runs & Results", S_H1))
    story.append(data_table(
        ["Request", "Method & Path", "Asserts / Behaviour"],
        [["Create Run", "POST /api/runs/project/{{projectId}}", "201; status IN_PROGRESS; saves runId."],
         ["Create Run w/ TC ids", "POST /api/runs/project/{{projectId}}", "201; run scoped to selectedCaseIds."],
         ["List Runs", "GET /api/runs/project/{{projectId}}", "200; array of runs."],
         ["Get Run w/ Results", "GET /api/runs/{{runId}}", "200; results[] + summary counts."],
         ["Submit Result (PASS)", "POST /api/runs/{{runId}}/results", "200; upsert; status PASS."],
         ["Submit Result (FAIL)", "POST /api/runs/{{runId}}/results", "200; same case -> FAIL (upsert)."],
         ["[Error] Invalid Status", "POST /api/runs/{{runId}}/results", "400; status must be enum."],
         ["Update Run (Complete)", "PUT /api/runs/{{runId}}", "200; status COMPLETED."],
         ["Delete Run", "DELETE /api/runs/{{runId}}", "200; success message."]],
        [38 * mm, 60 * mm, CW - 98 * mm]))
    story.append(b("<b>Upsert behaviour:</b> submitting a result for the same "
                   "<font face='Courier'>(runId, testCaseId)</font> pair updates the existing result "
                   "rather than creating a duplicate — that's why PASS then FAIL on the same case is a "
                   "valid demonstration. Result statuses: "
                   "<font face='Courier'>PASS, FAIL, SKIP, BLOCKED</font>. Run statuses: "
                   "<font face='Courier'>IN_PROGRESS, COMPLETED, ABORTED</font>."))
    story.append(hr())

    # ====================================================================
    # SECTION 14 — Dashboard
    # ====================================================================
    story.append(section_label(14))
    story.append(Paragraph("Request Catalogue: Dashboard", S_H1))
    story.append(data_table(
        ["Request", "Method & Path", "Asserts"],
        [["Get Dashboard Stats", "GET /api/dashboard/stats", "200; all stat keys; passRate 0-100; activeProjects<=total."],
         ["[Error] No Token", "GET /api/dashboard/stats", "401; error message present."]],
        [40 * mm, 52 * mm, CW - 92 * mm]))
    story.append(b("The stats payload aggregates the whole estate: "
                   "<font face='Courier'>totalProjects, activeProjects, totalTestCases, totalRuns, "
                   "activeRuns, passRatePercent, recentRuns (max 5), resultBreakdown "
                   "{PASS,FAIL,SKIP,BLOCKED}, latestRunName/Status/Results</font>."))
    story.append(tip_box("Good assertions to show off",
        ["Beyond &#8220;is it 200&#8221;, this request asserts <b>business invariants</b>: pass rate is "
         "within 0-100 and activeProjects can never exceed totalProjects. Asserting invariants, not just "
         "types, is what separates a senior test from a junior one."]))
    story.append(hr())

    # ====================================================================
    # SECTION 15 — Negative testing
    # ====================================================================
    story.append(section_label(15))
    story.append(Paragraph("Negative Testing & Status Codes", S_H1))
    story.append(b("Roughly a third of the collection is <b>negative tests</b> — the cases that prove "
                   "the API fails <i>correctly</i>. Each asserts both the status code and the error "
                   "body contract."))
    story.append(data_table(
        ["Code", "Meaning", "Example in this collection"],
        [["400", "Bad Request / validation", "Empty login fields; missing test-case title; invalid result status."],
         ["401", "Unauthorized", "Get Me with no token; wrong password; invalid refresh token; dashboard no token."],
         ["403", "Forbidden (role)", "TESTER token hitting an ADMIN-only users endpoint."],
         ["404", "Not Found", "Get project with a non-existent id."],
         ["201", "Created", "Successful create of project / suite / case / run."],
         ["200", "OK", "Reads, updates, logins, result submissions."]],
        [16 * mm, 40 * mm, CW - 56 * mm]))
    story.append(tip_box("Interview tip",
        ["&#8220;Why test error paths?&#8221; Because most production incidents are the unhappy path: bad "
         "input, missing auth, wrong role. A suite that only tests 200s gives false confidence."]))
    story.append(hr())

    # ====================================================================
    # SECTION 16 — Runner & Newman
    # ====================================================================
    story.append(section_label(16))
    story.append(Paragraph("Running at Scale: Collection Runner & Newman", S_H1))
    story.append(b("Because requests are ordered and chained, the whole collection runs unattended in "
                   "the <b>Collection Runner</b> (GUI) or <b>Newman</b> (CLI / CI). Newman is the same "
                   "engine, scriptable for pipelines:"))
    story.append(CodeBlock(
        '# install once\n'
        'npm install -g newman newman-reporter-htmlextra\n\n'
        '# run the collection against the Production environment\n'
        'newman run "testHub API - Full Collection.postman_collection.json" \\\n'
        '  -e "testHub - Production.postman_environment.json" \\\n'
        '  --reporters cli,htmlextra \\\n'
        '  --reporter-htmlextra-export reports/testhub.html', CW))
    story.append(b("In CI you'd warm the services first (hit <font face='Courier'>/health</font>), then "
                   "run Newman and publish the HTML report as a build artifact. The collection's "
                   "ordering + variable chaining is exactly what makes this reproducible."))
    story.append(hr())

    # ====================================================================
    # SECTION 17 — Best practices & cheat sheet
    # ====================================================================
    story.append(section_label(17))
    story.append(Paragraph("Best Practices & Interview Cheat-Sheet", S_H1))
    story.append(Paragraph("What this collection does right", S_H3))
    for x in [
        "<b>One folder per resource</b>, requests ordered into an end-to-end flow.",
        "<b>Environments</b> for Prod/Local; secrets &amp; tokens in environment scope, not hard-coded.",
        "<b>Collection-level auth</b> so every request inherits the Bearer token (DRY).",
        "<b>Collection pre-request interceptor</b> that auto-refreshes the JWT.",
        "<b>Dynamic, unique data</b> in pre-request scripts so runs are repeatable.",
        "<b>Self-seeding negative tests</b> (register-then-duplicate) for determinism.",
        "<b>Variable chaining</b> of ids through the whole lifecycle.",
        "<b>Positive and negative</b> coverage with status + schema + value assertions.",
        "<b>Cleanup</b> on delete (cascade + clearing of chained ids).",
    ]:
        story.append(bullet(x))
    story.append(Paragraph("Rapid-fire interview answers", S_H3))
    story.append(data_table(
        ["Question", "One-line answer"],
        [["Collection vs environment variable?", "Env is per-target & narrower; it overrides the collection default."],
         ["Pre-request vs test script?", "Pre-request runs before the call (setup); test runs after (assertions)."],
         ["How to chain requests?", "Save a value with pm.*.set() in tests; read it as {{var}} in the next request."],
         ["Access vs refresh token?", "Access = short-lived, sent every call; refresh = long-lived, mints new access."],
         ["How to handle token expiry?", "A pre-request interceptor decodes exp and refreshes proactively."],
         ["What do you assert?", "Status, schema/keys, key values, headers, response time, error contract."],
         ["How to run in CI?", "Newman with the environment file; publish an HTML report artifact."],
         ["Why negative tests?", "Most real failures are the unhappy path — bad input, auth, roles."]],
        [58 * mm, CW - 58 * mm]))
    story.append(Spacer(1, 6))
    story.append(b("<b>Run order to memorise:</b> Health &#8594; Auth &#8594; Projects &#8594; Suites "
                   "&#8594; Test Cases &#8594; Runs &#8594; Dashboard. Warm up first; clean up last."))
    story.append(tip_box("Final note",
        ["If you can walk an interviewer through this collection — architecture, environments, the auth "
         "lifecycle, the refresh interceptor, chaining, and your assertion strategy — you've "
         "demonstrated practical, job-ready API testing skill, not just theory."]))

    return story


if __name__ == "__main__":
    import os
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "testHub_Postman_Study_Guide.pdf")
    doc = Guide(out)
    doc.build(build())
    print("WROTE", out, os.path.getsize(out), "bytes")
