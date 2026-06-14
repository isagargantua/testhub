#!/usr/bin/env python3
"""
build_automation_guide.py
Generates testhub-automation-guide.pdf — an interactive, fully cross-linked
documentation PDF for the testhub-automation framework.

Every class/method/path mentioned was read from the actual source at
automation/testhub-automation. Interactive features:
  * clickable Table of Contents (multiBuild + TOCEntry notifications)
  * PDF outline bookmarks for every chapter / section / class
  * internal links: <link href="#cls_X"> in text, linkRect in diagrams
"""

import datetime

from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak,
    Table, TableStyle, Flowable, NextPageTemplate, KeepTogether, Preformatted,
)
from reportlab.platypus.tableofcontents import TableOfContents

OUT = r"D:\AI-Testing\testHub\testhub-automation-guide.pdf"

# ---------------------------------------------------------------- palette ---
INK    = HexColor("#1F2937")   # body text - dark slate
MUTED  = HexColor("#6B7280")   # secondary text
UI     = HexColor("#2563EB")   # UI accent  (blue)
APIC   = HexColor("#15803D")   # API accent (green)
HYB    = HexColor("#C2410C")   # HYBRID accent (orange)
COMMON = HexColor("#475569")   # common/shared accent (slate)
LINE   = HexColor("#D1D5DB")

TINT = {  # pastel fills - always paired with dark text for contrast
    "UI":     HexColor("#EAF1FE"),
    "API":    HexColor("#E9F6EE"),
    "HYBRID": HexColor("#FDF0E7"),
    "COMMON": HexColor("#EEF1F5"),
    "NEUT":   HexColor("#F5F6F8"),
}
ACCENT = {"UI": UI, "API": APIC, "HYBRID": HYB, "COMMON": COMMON, "NEUT": MUTED}

PAGE_W, PAGE_H = A4
M_L, M_R, M_T, M_B = 18 * mm, 18 * mm, 16 * mm, 16 * mm
BODY_W = PAGE_W - M_L - M_R

# ----------------------------------------------------------------- styles ---
def st(name, **kw):
    base = dict(fontName="Helvetica", fontSize=9.5, leading=13.5,
                textColor=INK, spaceAfter=5)
    base.update(kw)
    return ParagraphStyle(name, **base)

S = {
    "H1": st("H1", fontName="Helvetica-Bold", fontSize=20, leading=24,
             textColor=HexColor("#111827"), spaceBefore=6, spaceAfter=10),
    "H2": st("H2", fontName="Helvetica-Bold", fontSize=14, leading=18,
             textColor=HexColor("#111827"), spaceBefore=14, spaceAfter=6),
    "H3": st("H3", fontName="Helvetica-Bold", fontSize=11.5, leading=15,
             textColor=HexColor("#111827"), spaceBefore=10, spaceAfter=4),
    "Body": st("Body"),
    "Small": st("Small", fontSize=8.5, leading=12, textColor=MUTED),
    "Cell": st("Cell", fontSize=8.5, leading=11.5, spaceAfter=0),
    "CellB": st("CellB", fontName="Helvetica-Bold", fontSize=8.5,
                leading=11.5, spaceAfter=0),
    "CellW": st("CellW", fontName="Helvetica-Bold", fontSize=8.5,
                leading=11.5, textColor=colors.white, spaceAfter=0),
    "Mono": st("Mono", fontName="Courier", fontSize=8, leading=10.5,
               spaceAfter=0),
    "Quote": st("Quote", fontSize=9.5, leading=14, leftIndent=10,
                textColor=HexColor("#374151")),
}
CODE_STYLE = ParagraphStyle("Code", fontName="Courier", fontSize=7.8,
                            leading=10.2, textColor=HexColor("#111827"))

TOC_L0 = ParagraphStyle("TOC0", fontName="Helvetica-Bold", fontSize=11,
                        leading=16, textColor=INK, spaceBefore=8)
TOC_L1 = ParagraphStyle("TOC1", fontName="Helvetica", fontSize=9.5,
                        leading=13.5, leftIndent=14, textColor=INK)

def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def L(name, label=None, color=None):
    """Internal link to a class page."""
    c = (color or UI).hexval()[2:]
    return '<link href="#cls_%s" color="#%s"><u>%s</u></link>' % (
        name, c, esc(label or name))

def SEC(key, label, color=UI):
    c = color.hexval()[2:]
    return '<link href="#%s" color="#%s"><u>%s</u></link>' % (key, c, esc(label))

# ------------------------------------------------------------ doc template --
class GuideDoc(BaseDocTemplate):
    def afterFlowable(self, fl):
        bm = getattr(fl, "_bm", None)
        if bm:
            key, level, text, toc_level = bm
            # Land the jump exactly at the heading, not the page top.
            top = min(self.frame._y + getattr(fl, "height", 0) + 16, PAGE_H)
            self.canv.bookmarkPage(key, fit="XYZ", top=top)
            self.canv.addOutlineEntry(text, key, level=level, closed=(level >= 1))
            if toc_level is not None:
                self.notify("TOCEntry", (toc_level, text, self.page, key))

def heading(text, style, key, level, toc_level):
    p = Paragraph(esc(text), style)
    p._bm = (key, level, text, toc_level)
    return p

_n = [0, 0, 0]
def H1(text, key=None):
    _n[0] += 1; _n[1] = 0; _n[2] = 0
    t = "%d.  %s" % (_n[0], text)
    return heading(t, S["H1"], key or "h1_%d" % _n[0], 0, 0)

def H2(text, key=None):
    _n[1] += 1; _n[2] = 0
    t = "%d.%d  %s" % (_n[0], _n[1], text)
    return heading(t, S["H2"], key or "h2_%d_%d" % (_n[0], _n[1]), 1, 1)

def H3(text, key=None, toc=None):
    _n[2] += 1
    return heading(text, S["H3"], key or "h3_%d_%d_%d" % tuple(_n), 2, toc)

def P(txt, style="Body"):
    return Paragraph(txt, S[style])

def code(src, title=None):
    rows = []
    if title:
        rows.append([Paragraph('<font color="#FFFFFF"><b>%s</b></font>' % esc(title),
                               st("ct", fontSize=7.5, leading=9, spaceAfter=0,
                                  textColor=colors.white))])
    rows.append([Preformatted(src.strip("\n"), CODE_STYLE)])
    t = Table(rows, colWidths=[BODY_W])
    cmds = [
        ("BACKGROUND", (0, len(rows) - 1), (-1, len(rows) - 1), TINT["NEUT"]),
        ("BOX", (0, 0), (-1, -1), 0.7, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    if title:
        cmds.append(("BACKGROUND", (0, 0), (-1, 0), HexColor("#374151")))
        cmds.append(("TOPPADDING", (0, 0), (-1, 0), 3))
        cmds.append(("BOTTOMPADDING", (0, 0), (-1, 0), 3))
    t.setStyle(TableStyle(cmds))
    return t

def tbl(header, rows, widths, accent=COMMON, header_white=True):
    data = [[Paragraph(esc(h), S["CellW" if header_white else "CellB"]) for h in header]]
    for r in rows:
        data.append([Paragraph(c if c.startswith("<") or "<link" in c or "<b>" in c
                               or "<font" in c else esc(c), S["Cell"]) for c in r])
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), accent),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, TINT["NEUT"]]),
        ("GRID", (0, 0), (-1, -1), 0.5, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
    ]))
    return t

def chip_par(items):
    """Colored layer chips rendered as an inline paragraph."""
    parts = []
    for label, kind in items:
        parts.append('<font backColor="#%s" color="#FFFFFF"><b>&nbsp;%s&nbsp;</b></font>'
                     % (ACCENT[kind].hexval()[2:], esc(label)))
    return Paragraph("&nbsp;&nbsp;".join(parts), S["Body"])

# ----------------------------------------------------------------- diagrams -
class Box:
    def __init__(self, x, y, w, h, kind, title, sub=None, link=None):
        self.x, self.y, self.w, self.h = x, y, w, h
        self.kind, self.title, self.sub, self.link = kind, title, sub, link

class Diagram(Flowable):
    """Generic vector diagram: boxes + arrows, with optional internal links."""
    def __init__(self, width, height, boxes, arrows, title=None):
        super().__init__()
        self.width, self.height = width, height
        self.boxes, self.arrows, self.title = boxes, arrows, title

    def wrap(self, aw, ah):
        return self.width, self.height

    def _arrow(self, c, x1, y1, x2, y2):
        c.setStrokeColor(MUTED); c.setLineWidth(0.9)
        c.line(x1, y1, x2, y2)
        import math
        ang = math.atan2(y2 - y1, x2 - x1)
        for da in (2.6, -2.6):
            c.line(x2, y2, x2 - 5 * math.cos(ang + da), y2 - 5 * math.sin(ang + da))

    def draw(self):
        c = self.canv
        if self.title:
            c.setFont("Helvetica-Bold", 9)
            c.setFillColor(MUTED)
            c.drawString(0, self.height - 9, self.title)
        for a in self.arrows:
            self._arrow(c, *a)
        for b in self.boxes:
            c.setFillColor(TINT[b.kind])
            c.setStrokeColor(ACCENT[b.kind]); c.setLineWidth(1.1)
            c.roundRect(b.x, b.y, b.w, b.h, 4, stroke=1, fill=1)
            c.setFillColor(INK)
            c.setFont("Helvetica-Bold", 8)
            ty = b.y + b.h - 12 if b.sub else b.y + b.h / 2 - 3
            c.drawCentredString(b.x + b.w / 2, ty, b.title)
            if b.sub:
                c.setFont("Helvetica", 6.7); c.setFillColor(HexColor("#374151"))
                c.drawCentredString(b.x + b.w / 2, b.y + 5, b.sub)
            if b.link:
                c.linkRect("", b.link, (b.x, b.y, b.x + b.w, b.y + b.h),
                           relative=1, Border="[0 0 0]")

class FlowDiagram(Flowable):
    """Vertical numbered execution flow. Each step box can link to a class."""
    STEP_H, GAP = 36, 13

    def __init__(self, steps, width=BODY_W, title=None):
        super().__init__()
        self.steps, self.width, self.title = steps, width, title
        self.height = (self.STEP_H + self.GAP) * len(steps) - self.GAP + (16 if title else 0)

    def wrap(self, aw, ah):
        return self.width, self.height

    def draw(self):
        c = self.canv
        top = self.height
        if self.title:
            c.setFont("Helvetica-Bold", 9.5); c.setFillColor(INK)
            c.drawString(0, top - 10, self.title)
            top -= 16
        x, w = 26, self.width - 26
        y = top - self.STEP_H
        for i, s in enumerate(self.steps):
            kind = s.get("kind", "NEUT")
            c.setFillColor(TINT[kind]); c.setStrokeColor(ACCENT[kind]); c.setLineWidth(1.2)
            c.roundRect(x, y, w, self.STEP_H, 5, stroke=1, fill=1)
            # number badge
            c.setFillColor(ACCENT[kind])
            c.circle(x - 12, y + self.STEP_H / 2, 8.5, stroke=0, fill=1)
            c.setFillColor(colors.white); c.setFont("Helvetica-Bold", 8.5)
            c.drawCentredString(x - 12, y + self.STEP_H / 2 - 3, str(i + 1))
            # text
            c.setFillColor(INK); c.setFont("Helvetica-Bold", 8.6)
            c.drawString(x + 10, y + self.STEP_H - 14, s["title"])
            c.setFillColor(HexColor("#374151")); c.setFont("Helvetica", 7.4)
            c.drawString(x + 10, y + 7, s.get("sub", ""))
            if s.get("link"):
                c.linkRect("", s["link"], (x, y, x + w, y + self.STEP_H),
                           relative=1, Border="[0 0 0]")
            if i < len(self.steps) - 1:
                c.setStrokeColor(MUTED); c.setLineWidth(0.9)
                mx = x + w / 2
                c.line(mx, y, mx, y - self.GAP + 3)
                c.line(mx, y - self.GAP + 3, mx - 3.5, y - self.GAP + 8)
                c.line(mx, y - self.GAP + 3, mx + 3.5, y - self.GAP + 8)
            y -= self.STEP_H + self.GAP

class TreeDiagram(Flowable):
    """Folder-structure tree. rows = (indent, label, kind, bold, link, note)."""
    ROW_H = 14.5

    def __init__(self, rows, width=BODY_W):
        super().__init__()
        self.rows, self.width = rows, width
        self.height = self.ROW_H * len(rows) + 8

    def wrap(self, aw, ah):
        return self.width, self.height

    def draw(self):
        c = self.canv
        y = self.height - self.ROW_H
        for indent, label, kind, bold, link, note in self.rows:
            x = 6 + indent * 16
            if indent:
                c.setStrokeColor(LINE); c.setLineWidth(0.7)
                c.line(x - 9, y + 4.5, x - 2, y + 4.5)
                c.line(x - 9, y + 4.5, x - 9, y + 4.5 + self.ROW_H)
            c.setFillColor(TINT[kind]); c.setStrokeColor(ACCENT[kind]); c.setLineWidth(0.9)
            c.rect(x, y, 8, 8, stroke=1, fill=1)
            c.setFillColor(INK)
            c.setFont("Helvetica-Bold" if bold else "Courier", 8.2)
            c.drawString(x + 13, y + 1.5, label)
            if note:
                c.setFillColor(MUTED); c.setFont("Helvetica-Oblique", 7.2)
                c.drawString(x + 13 + c.stringWidth(label, "Helvetica-Bold" if bold else "Courier", 8.2) + 8,
                             y + 1.5, note)
            if link:
                c.linkRect("", link, (x, y - 2, x + 200, y + 10),
                           relative=1, Border="[0 0 0]")
            y -= self.ROW_H

# ----------------------------------------------------------- page painters --
DOC_TITLE = "testHub Automation Guide"

def draw_body(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE); canvas.setLineWidth(0.6)
    canvas.line(M_L, M_B - 10, PAGE_W - M_R, M_B - 10)
    canvas.setFont("Helvetica", 7.5); canvas.setFillColor(MUTED)
    canvas.drawString(M_L, M_B - 20, DOC_TITLE + "  -  testhub-automation")
    canvas.drawRightString(PAGE_W - M_R, M_B - 20, "Page %d" % doc.page)
    canvas.restoreState()

def draw_cover(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(HexColor("#0F172A"))
    canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    canvas.setFillColor(HexColor("#1E293B"))
    canvas.rect(0, PAGE_H - 200, PAGE_W, 200, stroke=0, fill=1)
    for i, (col, label) in enumerate([(UI, "UI"), (APIC, "API"), (HYB, "HYBRID")]):
        x = M_L + i * 120
        canvas.setFillColor(col)
        canvas.roundRect(x, PAGE_H - 250, 100, 26, 6, stroke=0, fill=1)
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 12)
        canvas.drawCentredString(x + 50, PAGE_H - 242, label)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 30)
    canvas.drawString(M_L, PAGE_H - 120, "testHub Automation Guide")
    canvas.setFont("Helvetica", 13)
    canvas.setFillColor(HexColor("#CBD5E1"))
    canvas.drawString(M_L, PAGE_H - 148, "The complete, interactive reference for the testhub-automation suite")
    canvas.setFont("Helvetica", 10.5)
    y = PAGE_H - 320
    lines = [
        "Module:      automation/testhub-automation",
        "Stack:       Java 17  ·  Selenium 4.27  ·  TestNG 7.10  ·  RestAssured 5.5",
        "             ExtentReports 5.1  ·  Allure 2.29  ·  Log4j2  ·  Maven",
        "Layout:      src/common  +  src/api  +  src/ui  +  src/hybrid  +  src/resources",
        "App under test:  testHub - React SPA + API gateway + auth/core services",
        "",
        "Generated:   %s" % datetime.date.today().strftime("%d %b %Y"),
    ]
    for ln in lines:
        canvas.setFillColor(HexColor("#E2E8F0"))
        canvas.setFont("Courier", 10)
        canvas.drawString(M_L, y, ln)
        y -= 18
    canvas.setFont("Helvetica", 9)
    canvas.setFillColor(HexColor("#94A3B8"))
    canvas.drawString(M_L, 60, "Interactive PDF - use the bookmarks panel, the clickable contents page,")
    canvas.drawString(M_L, 47, "and the underlined cross-links; diagram boxes jump to class pages.")
    canvas.restoreState()

# ------------------------------------------------------------- class pages --
# (name, layer, package, path, extends, summary, methods[(sig, what)], used_by, depends)
def class_block(d):
    out = []
    out.append(H3(d["name"] + "   -   " + d["layer"], key="cls_" + d["name"], toc=None))
    meta = [
        ["Layer / package", "<b>%s</b>  ·  %s" % (d["layer"], esc(d["pkg"]))],
        ["File", esc(d["path"])],
    ]
    if d.get("ext"):
        meta.append(["Extends / implements", esc(d["ext"])])
    if d.get("used"):
        meta.append(["Used by", d["used"]])
    if d.get("deps"):
        meta.append(["Depends on", d["deps"]])
    t = Table([[Paragraph(esc(k), S["CellB"]), Paragraph(v, S["Cell"])] for k, v in meta],
              colWidths=[95, BODY_W - 95])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), TINT[d["kind"]]),
        ("GRID", (0, 0), (-1, -1), 0.5, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    out.append(t)
    out.append(Spacer(1, 3))
    out.append(P(d["summary"]))
    if d.get("methods"):
        out.append(tbl(["Key method", "What it does"],
                       [[("<font face='Courier' size='7.6'>%s</font>" % esc(m)), w]
                        for m, w in d["methods"]],
                       [205, BODY_W - 205], accent=ACCENT[d["kind"]]))
    if d.get("snippet"):
        out.append(Spacer(1, 4))
        out.append(code(d["snippet"], title=d.get("snippet_title")))
    out.append(Spacer(1, 10))
    return [KeepTogether(out)] if d.get("keep", True) else out

# ============================== CONTENT DATA =================================
ROOT = "src"
CLS = []  # filled below; rendered in chapter 2

def C(**kw):
    CLS.append(kw)
    return kw

# ---- common: config / constants / exceptions --------------------------------
C(name="ConfigManager", layer="COMMON", kind="COMMON",
  pkg="com.testhub.config", path=ROOT + "/common/java/com/testhub/config/ConfigManager.java",
  ext="final class (static only)",
  used="every layer - %s, %s, %s, %s, tests" % (L("DriverFactory"), L("WaitUtils"), L("ApiClient", color=APIC), L("BaseTest")),
  deps=L("FrameworkException") + ", config/config.properties on the classpath",
  summary="The single source of truth for configuration. Every lookup resolves in priority order: "
          "<b>1)</b> JVM system property (<font face='Courier'>-Dbrowser=firefox</font>), "
          "<b>2)</b> OS environment variable (UPPER_SNAKE_CASE, e.g. <font face='Courier'>BASE_URL</font>), "
          "<b>3)</b> <font face='Courier'>config/config.properties</font>. "
          "That is why the same build runs locally, against the live deployment and in CI with no code edits.",
  methods=[
      ("get(key) / get(key, default)", "Raw lookup with the 3-level override chain; throws FrameworkException if a required key is missing."),
      ("baseUrl() / apiBaseUrl()", "App and gateway URLs (trailing slash stripped)."),
      ("browser() / headless()", "Browser selection used by DriverFactory."),
      ("explicitTimeout() / pageLoadTimeout() / pollingInterval()", "Durations behind every wait in WaitUtils."),
      ("reuseUser() / testerEmail() / testerPassword()", "Existing-account login strategy for UI tests."),
      ("adminEmail() / adminPassword()", "Standing ADMIN account credentials."),
      ("reportType() / extentEnabled() / allureEnabled()", "Reporting switch: extent | allure | both."),
      ("retryCount(), warmupEnabled(), screenshotOnFailure(), screenshotOnSuccess()", "Retry, warm-up and screenshot policies."),
  ],
  snippet="""
public static String get(String key) {
    String sys = System.getProperty(key);
    if (sys != null && !sys.isBlank()) return sys.trim();
    String env = System.getenv(key.toUpperCase().replace('.', '_'));
    if (env != null && !env.isBlank()) return env.trim();
    String value = PROPERTIES.getProperty(key);
    if (value == null)
        throw new FrameworkException("Missing configuration key: " + key);
    return value.trim();
}""",
  snippet_title="ConfigManager.java - the 3-level resolution chain")

C(name="FrameworkConstants", layer="COMMON", kind="COMMON",
  pkg="com.testhub.constants", path=ROOT + "/common/java/com/testhub/constants/FrameworkConstants.java",
  ext="final class (static only)",
  used="paths: %s, %s, %s · routes: pages and %s" % (L("ScreenshotUtils"), L("JsonDataReader"), L("ExcelDataReader"), L("BaseTest")),
  summary="Compile-time constants in one place so magic strings never leak: filesystem paths "
          "(<font face='Courier'>test-output/</font> with reports/screenshots/downloads subfolders, "
          "<font face='Courier'>src/resources/testdata</font>), app routes "
          "(<font face='Courier'>/login, /register, /, /projects, /test-cases, /users</font>) and the two "
          "localStorage keys (<font face='Courier'>accessToken, refreshToken</font>) used by the hybrid session bridge.")

C(name="FrameworkException", layer="COMMON", kind="COMMON",
  pkg="com.testhub.exceptions", path=ROOT + "/common/java/com/testhub/exceptions/FrameworkException.java",
  ext="extends RuntimeException",
  used="thrown by %s, %s, %s, %s, %s" % (L("ConfigManager"), L("DriverManager"), L("ApiClient", color=APIC), L("JsonDataReader"), L("FileDownloadUtils")),
  summary="The framework's single unchecked exception. Wrapping low-level checked exceptions in it keeps "
          "page objects and tests free of try/catch boilerplate, and failures carry one clear, "
          "framework-level message (missing config key, non-2xx API call, unreadable data file...).")

# ---- driver -----------------------------------------------------------------
C(name="DriverFactory", layer="COMMON", kind="COMMON",
  pkg="com.testhub.driver", path=ROOT + "/common/java/com/testhub/driver/DriverFactory.java",
  ext="final class (static only)",
  used="%s.setUp() - @BeforeMethod creates one browser per test" % L("BaseTest"),
  deps="%s, %s, %s" % (L("ConfigManager"), L("DriverManager"), L("BrowserType")),
  summary="Creates and configures the WebDriver. No driver binaries are managed by hand - Selenium 4's "
          "built-in <b>Selenium Manager</b> downloads the matching driver automatically. Chrome/Edge/Firefox "
          "options force downloads into <font face='Courier'>test-output/downloads</font>, and headless runs get a forced "
          "1920x1080 window because headless 'maximize' is unreliable and would drop below the app's 1024px "
          "sidebar breakpoint.",
  methods=[
      ("createDriver()", "switch on BrowserType -> new ChromeDriver/EdgeDriver/FirefoxDriver with options; sets page-load timeout + window size; registers the driver with DriverManager."),
      ("chromeOptions / edgeOptions / firefoxOptions(headless)", "Per-browser launch args + download preferences."),
      ("applyExtraArguments(...)", "Adds comma-separated args from the browser.arguments config key."),
  ],
  snippet="""
WebDriver driver = switch (browser) {
    case CHROME -> new ChromeDriver(chromeOptions(headless));
    case EDGE -> new EdgeDriver(edgeOptions(headless));
    case FIREFOX -> new FirefoxDriver(firefoxOptions(headless));
};
configureTimeoutsAndWindow(driver);
DriverManager.setDriver(driver);""",
  snippet_title="DriverFactory.createDriver() - core")

C(name="DriverManager", layer="COMMON", kind="COMMON",
  pkg="com.testhub.driver", path=ROOT + "/common/java/com/testhub/driver/DriverManager.java",
  ext="final class (static only)",
  used="%s, %s, %s, %s - anything that needs the current browser" % (L("BasePage"), L("WaitUtils"), L("JavaScriptUtils"), L("ScreenshotUtils")),
  summary="A <b>ThreadLocal&lt;WebDriver&gt;</b> holder - the key to safe parallel execution. Every TestNG "
          "thread gets its own driver; page objects pull it from here instead of passing it around. "
          "getDriver() fails fast with a clear message if no driver exists on the current thread.",
  methods=[
      ("getDriver()", "Returns this thread's driver or throws FrameworkException."),
      ("setDriver(driver)", "Package-private - only DriverFactory registers drivers."),
      ("hasDriver()", "Null-safe check (used before screenshots)."),
      ("quitDriver()", "driver.quit() then ThreadLocal.remove() to prevent leaks."),
  ],
  snippet="""
private static final ThreadLocal<WebDriver> DRIVER = new ThreadLocal<>();

public static WebDriver getDriver() {
    WebDriver driver = DRIVER.get();
    if (driver == null)
        throw new FrameworkException(
            "No WebDriver for the current thread. Was the driver created in @BeforeMethod?");
    return driver;
}""",
  snippet_title="DriverManager.java - ThreadLocal isolation")

# ---- enums -------------------------------------------------------------------
C(name="BrowserType", layer="COMMON", kind="COMMON",
  pkg="com.testhub.enums", path=ROOT + "/common/java/com/testhub/enums/BrowserType.java",
  ext="enum: CHROME, FIREFOX, EDGE",
  used=L("DriverFactory"),
  summary="Maps the <font face='Courier'>browser</font> config string to a typed value; "
          "<font face='Courier'>from(value)</font> throws a clear FrameworkException for unsupported names.")

C(name="Priority", layer="COMMON", kind="COMMON",
  pkg="com.testhub.enums", path=ROOT + "/common/java/com/testhub/enums/Priority.java",
  ext="enum: LOW, MEDIUM, HIGH, CRITICAL",
  used="%s.createTestCase, %s, %s" % (L("ApiClient", color=APIC), L("SuiteDetailPage"), L("DataProviders")),
  summary="Test-case priority values exactly as the testHub UI/API accepts them.")

C(name="ResultStatus", layer="COMMON", kind="COMMON",
  pkg="com.testhub.enums", path=ROOT + "/common/java/com/testhub/enums/ResultStatus.java",
  ext="enum: PASS, FAIL, SKIP, BLOCKED",
  used="%s.markResult, %s, %s" % (L("ApiClient", color=APIC), L("RunDetailPage"), L("DashboardPage")),
  summary="Per-test-case outcome recorded inside a run; also drives the dashboard result-breakdown filter.")

C(name="RunStatus", layer="COMMON", kind="COMMON",
  pkg="com.testhub.enums", path=ROOT + "/common/java/com/testhub/enums/RunStatus.java",
  ext="enum: IN_PROGRESS, COMPLETED, ABORTED",
  used="%s, %s" % (L("TestRunsPage"), L("RunDetailPage")),
  summary="Run lifecycle status. Each value carries a human label() ('In Progress'...) matching the "
          "run-status dropdown text in the UI.")

C(name="Role", layer="COMMON", kind="COMMON",
  pkg="com.testhub.enums", path=ROOT + "/common/java/com/testhub/enums/Role.java",
  ext="enum: ADMIN, TESTER, VIEWER",
  used="role assertions in tests",
  summary="User roles. App rule: the first account ever registered on a fresh database becomes ADMIN; "
          "every later self-registration is a TESTER.")

# ---- utils -------------------------------------------------------------------
C(name="WaitUtils", layer="COMMON", kind="COMMON",
  pkg="com.testhub.utils", path=ROOT + "/common/java/com/testhub/utils/WaitUtils.java",
  ext="final class (static only)",
  used="every page object via %s; pages directly for URL waits" % L("BasePage"),
  deps="%s, %s" % (L("DriverManager"), L("ConfigManager")),
  summary="All synchronisation lives here - <b>explicit waits only</b>. There are no implicit waits and no "
          "Thread.sleep anywhere in page code. Default timeout is 40 s (generous on purpose: the free-tier "
          "backend can cold-start ~24 s+), polling every 1 s.",
  methods=[
      ("waitForVisible(locator[, timeout])", "visibilityOfElementLocated - the workhorse."),
      ("waitForClickable(locator|element)", "Used by every click in BasePage."),
      ("waitForInvisible / waitForPresence / waitForAllVisible", "Negative + presence conditions."),
      ("waitForUrlContains / waitForUrlToBe", "Route-change assertions after login/register."),
      ("isPresent(locator)", "Instant no-wait existence check."),
      ("waitForPageReady()", "FluentWait until document.readyState == 'complete' (SPA load)."),
  ])

C(name="JavaScriptUtils", layer="COMMON", kind="COMMON",
  pkg="com.testhub.utils", path=ROOT + "/common/java/com/testhub/utils/JavaScriptUtils.java",
  ext="final class (static only)",
  used="%s click fallback; %s session bridge; %s" % (L("BasePage"), L("HybridBaseTest", color=HYB), L("LoginPage")),
  summary="Thin JavascriptExecutor wrapper for the few cases where a native interaction is flaky: JS click "
          "when an overlay intercepts, scrollIntoView, and - crucially for the hybrid layer - "
          "setLocalStorage/getLocalStorage used to inject API-obtained JWT tokens into the browser.",
  methods=[
      ("execute(script, args...)", "Raw executeScript."),
      ("clickWithJs(element)", "Fallback when ElementClickInterceptedException is thrown."),
      ("setLocalStorage(key, value) / getLocalStorage(key)", "Token injection for the hybrid session bridge."),
      ("scrollIntoView / scrollToBottom / clearLocalStorage", "Misc helpers."),
  ])

C(name="AlertUtils", layer="COMMON", kind="COMMON",
  pkg="com.testhub.utils", path=ROOT + "/common/java/com/testhub/utils/AlertUtils.java",
  ext="final class (static only)",
  used="%s.deleteProject (and any window.confirm flow)" % L("ProjectsPage"),
  summary="Native browser dialog handling. testHub deletes projects/users via window.confirm(), which "
          "Selenium exposes as an Alert - acceptAlert()/dismissAlert() wait for it, capture its text and "
          "answer it.",
  methods=[
      ("waitForAlert()", "Explicit wait until alertIsPresent."),
      ("acceptAlert() / dismissAlert()", "Answer the dialog, returning its text."),
      ("isAlertPresent()", "Instant check via switchTo().alert()."),
  ])

C(name="ScreenshotUtils", layer="COMMON", kind="COMMON",
  pkg="com.testhub.utils", path=ROOT + "/common/java/com/testhub/utils/ScreenshotUtils.java",
  ext="final class (static only)",
  used="%s.tearDown captures; %s embeds into the report" % (L("BaseTest"), L("TestListener")),
  summary="Captures screenshots to disk (PNG in test-output/screenshots) and as Base64 for inline report "
          "embedding. Its special trick: <b>captureAndStore()</b> snapshots the browser into a per-thread "
          "slot at the END of @AfterMethod - BEFORE driver.quit() - because TestNG fires listeners after "
          "@AfterMethod, when the driver is already gone.",
  methods=[
      ("capture(testName)", "PNG to disk, timestamped, sanitised filename."),
      ("captureBase64()", "In-memory Base64 PNG."),
      ("captureAndStore() / getStored() / clearStored()", "The handoff between tearDown and TestListener."),
  ])

C(name="JsonDataReader", layer="COMMON", kind="COMMON",
  pkg="com.testhub.utils", path=ROOT + "/common/java/com/testhub/utils/JsonDataReader.java",
  ext="final class (static only)",
  used=L("DataProviders"),
  deps="Jackson ObjectMapper; reads src/resources/testdata",
  summary="Deserialises JSON test-data files into typed POJO lists (e.g. invalid-logins.json into "
          "List&lt;LoginData&gt;) and converts any list into the Object[][] shape a TestNG @DataProvider "
          "must return - one row per test invocation.",
  methods=[
      ("read(file, type) / readList(file, elementType)", "Whole-file or top-level-array deserialisation."),
      ("readMaps(file)", "Untyped list of maps."),
      ("toDataProvider(rows)", "List -> Object[][] for TestNG."),
  ])

C(name="ExcelDataReader", layer="COMMON", kind="COMMON",
  pkg="com.testhub.utils", path=ROOT + "/common/java/com/testhub/utils/ExcelDataReader.java",
  ext="final class (static only)",
  used="%s.casesFromExcel (ready for an .xlsx drop-in)" % L("DataProviders"),
  deps="Apache POI (XSSFWorkbook)",
  summary="Reads .xlsx sheets into a list of header->value row maps (first row = header) - the Excel arm of "
          "the data-driven trio (JSON / CSV / Excel). Uses POI's DataFormatter so numbers and dates come "
          "back exactly as displayed.",
  methods=[
      ("read(fileName, sheetName)", "Sheet -> List<Map<String,String>>; clear error if the sheet is missing."),
      ("toDataProvider(rows)", "Rows -> Object[][] for TestNG."),
  ])

C(name="FileDownloadUtils", layer="COMMON", kind="COMMON",
  pkg="com.testhub.utils", path=ROOT + "/common/java/com/testhub/utils/FileDownloadUtils.java",
  ext="final class (static only)",
  used="CSV/JSON export download tests",
  summary="Asserting on real browser downloads: the browser is forced (by DriverFactory prefs) to download "
          "into test-output/downloads, then waitForDownload(ext) polls until a completed file with that "
          "extension appears - ignoring partial .crdownload/.part files.",
  methods=[
      ("downloadDir() / clearDownloads()", "Managed download folder."),
      ("waitForDownload(extension)", "Newest completed file or FrameworkException after the explicit timeout."),
  ])

C(name="TestDataFactory", layer="COMMON", kind="COMMON",
  pkg="com.testhub.utils", path=ROOT + "/common/java/com/testhub/utils/TestDataFactory.java",
  ext="final class (static only)",
  used="every test that creates records (UI, API and hybrid)",
  deps="DataFaker",
  summary="Generates realistic, <b>guaranteed-unique</b> test data: every name/email embeds a timestamp + "
          "random suffix, so parallel threads and repeated runs never collide on the shared backend - the "
          "framework's self-cleaning-data strategy starts here.",
  methods=[
      ("uniqueEmail()", "qa_<millis><rand>@testhub.io"),
      ("fullName() / password()", "Faker name; password always satisfies the 6-char minimum."),
      ("projectName() / suiteName() / testCaseTitle() / runName()", "Readable + unique entity names."),
      ("sentence() / steps() / expected()", "Filler content for descriptions and case steps."),
  ],
  snippet="""
private static String unique() {
    return System.currentTimeMillis() + "" + FAKER.number().numberBetween(100, 999);
}
public static String uniqueEmail() { return "qa_" + unique() + "@testhub.io"; }
public static String password()    { return "Pass@" + FAKER.number().numberBetween(10000, 99999); }""",
  snippet_title="TestDataFactory.java - uniqueness")

# ---- reports & listeners ------------------------------------------------------
C(name="ExtentManager", layer="COMMON", kind="COMMON",
  pkg="com.testhub.reports", path=ROOT + "/common/java/com/testhub/reports/ExtentManager.java",
  ext="final class (static only)",
  used="%s; %s call setRunUser" % (L("TestListener"), L("BaseTest")),
  summary="Owns the single ExtentReports instance plus a ThreadLocal ExtentTest so parallel tests log into "
          "their own node. Writes to a hidden working file during the run, then every flush() copies it to "
          "<font face='Courier'>test-output/reports/Latest/Report-&lt;timestamp&gt;_&lt;user&gt;.html</font>; "
          "anything already in Latest/ is archived at the START of the next run. Dark theme, custom CSS, "
          "failed tests auto-expand.",
  methods=[
      ("getInstance()", "Lazy init: archive previous run, configure Spark reporter, fill the environment panel."),
      ("setRunUser(email)", "Once the signed-in user is known: updates the panel + report filename (null-safe when Extent is disabled)."),
      ("setTest / getTest / unload", "Per-thread ExtentTest accessor."),
      ("flush()", "Writes the working file and copies it to Latest/ under one stable name per run."),
  ])

C(name="TestListener", layer="COMMON", kind="COMMON",
  pkg="com.testhub.listeners", path=ROOT + "/common/java/com/testhub/listeners/TestListener.java",
  ext="implements ITestListener, ISuiteListener",
  used="registered via @Listeners on %s and in every suite XML" % L("BaseTest"),
  deps="%s, %s, %s" % (L("ExtentManager"), L("ScreenshotUtils"), L("ConfigManager")),
  summary="Bridges TestNG lifecycle events into ExtentReports: creates a report node per test (title, "
          "description, groups, parameters), logs PASS/FAIL/SKIP with duration, embeds the stored screenshot, "
          "and pretty-prints the stack trace on failure. When <font face='Courier'>report.type=allure</font> "
          "it skips all Extent work - Allure records through its own auto-registered TestNG listener.",
  methods=[
      ("onStart(suite) / onFinish(suite)", "Init Extent (if enabled) / flush the report."),
      ("onTestStart(result)", "Create the ExtentTest node; logs '>>> START'."),
      ("onTestSuccess / onTestFailure / onTestSkipped", "Result + duration + reason + stack trace + screenshot."),
      ("attachScreenshot(test, status)", "Pulls ScreenshotUtils.getStored() - captured before the driver quit."),
  ])

C(name="RetryAnalyzer", layer="COMMON", kind="COMMON",
  pkg="com.testhub.listeners", path=ROOT + "/common/java/com/testhub/listeners/RetryAnalyzer.java",
  ext="implements IRetryAnalyzer",
  used="attached to every @Test by %s" % L("RetryTransformer"),
  summary="Retries a failed test up to <font face='Courier'>retry.count</font> times (default 1). The "
          "free-tier backend can throw one transient cold-start failure on the first hit; a single retry "
          "turns that into a pass instead of a flaky red. Set retry.count=0 to disable.",
  snippet="""
@Override
public boolean retry(ITestResult result) {
    if (attempts < maxRetry) {
        attempts++;
        log.warn("Retrying '{}' (attempt {}/{}) after failure",
                result.getName(), attempts, maxRetry);
        return true;
    }
    return false;
}""",
  snippet_title="RetryAnalyzer.java")

C(name="RetryTransformer", layer="COMMON", kind="COMMON",
  pkg="com.testhub.listeners", path=ROOT + "/common/java/com/testhub/listeners/RetryTransformer.java",
  ext="implements IAnnotationTransformer",
  used="registered as a listener in every suite XML",
  summary="Applies %s to every @Test automatically at load time, so no test has to opt in with "
          "retryAnalyzer=... by hand. Skips tests that already set their own analyzer." % L("RetryAnalyzer"))

# ---- test data ---------------------------------------------------------------
C(name="DataProviders", layer="COMMON", kind="COMMON",
  pkg="com.testhub.tests.data", path=ROOT + "/common/java/com/testhub/tests/data/DataProviders.java",
  used="%s (invalidLogins) and any data-driven test" % L("LoginTest"),
  deps="%s, %s" % (L("JsonDataReader"), L("ExcelDataReader")),
  summary="Central home for TestNG @DataProviders - the data-driven backbone. "
          "<font face='Courier'>invalidLogins</font> feeds LoginData rows from invalid-logins.json, "
          "<font face='Courier'>testCases</font> feeds TestCaseData from testcases.json, "
          "<font face='Courier'>priorities</font> yields all four Priority values, and "
          "<font face='Courier'>casesFromExcel</font> is the Excel-driven variant (testcases.xlsx).")

C(name="LoginData", layer="COMMON", kind="COMMON",
  pkg="com.testhub.tests.data", path=ROOT + "/common/java/com/testhub/tests/data/LoginData.java",
  ext="POJO (Jackson)",
  used="%s.shouldRejectInvalidLogins" % L("LoginTest"),
  summary="One row of negative-login data: scenario, email, password, expectedError. toString() returns the "
          "scenario name so each data-driven run reads clearly in reports ('Wrong password', 'Malformed email'...).")

C(name="TestCaseData", layer="COMMON", kind="COMMON",
  pkg="com.testhub.tests.data", path=ROOT + "/common/java/com/testhub/tests/data/TestCaseData.java",
  ext="POJO (Jackson)",
  used="data-driven test-case creation",
  summary="One row of test-case creation data from testcases.json: title, description, steps, expected, "
          "priority - plus priorityEnum() to convert the string into the Priority enum.")

# ---- API layer ----------------------------------------------------------------
C(name="ApiClient", layer="API", kind="API",
  pkg="com.testhub.api", path=ROOT + "/api/java/com/testhub/api/ApiClient.java",
  ext="plain class - one instance per authenticated session",
  used="API tests; %s + both hybrid tests for seeding" % L("HybridBaseTest", color=HYB),
  deps="RestAssured, Jackson, %s, %s" % (L("ConfigManager"), L("FrameworkException")),
  summary="The RestAssured-backed client for the testHub gateway and the heart of the independent API layer. "
          "An instance carries an optional bearer token (set automatically by register/login), so the same "
          "client serves pure API tests and fast hybrid data-seeding. Every call goes through "
          "<font face='Courier'>ensure2xx()</font>, which throws a FrameworkException containing the HTTP "
          "status + body for any non-2xx response - that is how a 429 throttle surfaces with a readable message.",
  methods=[
      ("register(name, email, password)", "POST /api/auth/register -> AuthResponse; stores the access token."),
      ("login(email, password)", "POST /api/auth/login -> AuthResponse; stores the access token."),
      ("loginOrRegister(name, email, password)", "Login first; on failure registers instead (seeded users)."),
      ("createProject(name, desc) / deleteProject(id)", "POST /api/projects, DELETE /api/projects/{id}."),
      ("createSuite(projectId, name, desc)", "POST /api/suites/project/{projectId}."),
      ("createTestCase(suiteId, title, ..., priority)", "POST /api/testcases/suite/{suiteId}."),
      ("createRun(projectId, name, caseIds) / markResult(runId, caseId, status)", "POST /api/runs/project/{id}, POST /api/runs/{id}/results."),
      ("isHealthy() / allServicesHealthy()", "GET /health on the gateway / on all three services."),
      ("warmDomainServices()", "Best-effort GETs that wake the core service after a cold start."),
  ],
  snippet="""
private RequestSpecification base() {
    RequestSpecification spec = given().config(CONFIG)
            .baseUri(baseUrl).contentType("application/json").accept("application/json");
    if (token != null && !token.isBlank())
        spec.header("Authorization", "Bearer " + token);
    return spec;
}
private static Response ensure2xx(Response response, String action) {
    int code = response.statusCode();
    if (code < 200 || code >= 300)
        throw new FrameworkException("API " + action + " failed (HTTP " + code + "): "
                + response.getBody().asString());
    return response;
}""",
  snippet_title="ApiClient.java - request base + fail-fast")

for n, fields, note in [
    ("AuthResponse", "user (UserDto), accessToken, refreshToken",
     "Response of POST /api/auth/login and /api/auth/register. The two tokens are exactly what the hybrid layer writes into localStorage."),
    ("UserDto", "id, name, email, role", "The signed-in user; role is ADMIN/TESTER/VIEWER."),
    ("ProjectDto", "id, name, description, status", "A project; status defaults to ACTIVE on creation."),
    ("SuiteDto", "id, name, description, projectId", "A suite, linked to its parent project."),
    ("TestCaseDto", "id, title, description, steps, expected, priority, suiteId", "A test case, linked to its suite."),
    ("RunDto", "id, name, description, status, projectId, selectedCaseIds", "A test run and the case ids included in it."),
]:
    C(name=n, layer="API", kind="API",
      pkg="com.testhub.api.models", path=ROOT + "/api/java/com/testhub/api/models/%s.java" % n,
      ext="POJO - @JsonIgnoreProperties(ignoreUnknown = true)",
      used=L("ApiClient", color=APIC) + " deserialisation",
      summary="<b>Fields:</b> <font face='Courier'>%s</font>. %s All models ignore unknown JSON properties, "
              "so backend additions never break deserialisation." % (esc(fields), note))

C(name="ApiBaseTest", layer="API", kind="API",
  pkg="com.testhub.tests.api", path=ROOT + "/api/java/com/testhub/tests/api/ApiBaseTest.java",
  ext="abstract class",
  used="extended by %s and %s" % (L("AuthApiTest", color=APIC), L("ProjectApiTest", color=APIC)),
  summary="Base for pure-API tests. Unlike the UI BaseTest it <b>never launches a browser</b> - its only "
          "lifecycle is a @BeforeClass warm-up that polls the gateway /health (up to 8 x 3 s) so the first "
          "real request does not eat a cold start. Provides api() returning a fresh unauthenticated "
          + L("ApiClient", color=APIC) + ".")

C(name="AuthApiTest", layer="API", kind="API",
  pkg="com.testhub.tests.api", path=ROOT + "/api/java/com/testhub/tests/api/AuthApiTest.java",
  ext="extends ApiBaseTest",
  summary="Pure-API auth coverage, 4 tests: registration returns user + both tokens and role TESTER; "
          "a registered user can log in (email round-trips lowercased); wrong password fails with HTTP 401; "
          "duplicate registration is rejected with HTTP 400. Negative cases assert via "
          "Assert.expectThrows(FrameworkException.class, ...) on the ensure2xx failure message.")

C(name="ProjectApiTest", layer="API", kind="API",
  pkg="com.testhub.tests.api", path=ROOT + "/api/java/com/testhub/tests/api/ProjectApiTest.java",
  ext="extends ApiBaseTest",
  summary="Direct API coverage of the domain graph - and deliberately the same seeding helpers the hybrid "
          "tests rely on, so an API regression is caught here first. 3 tests: create project returns id + "
          "ACTIVE; the full project -> suite -> case graph builds correctly (ids link up, priority "
          "round-trips); a project can be deleted. @BeforeMethod registers a fresh user per test.")

# ---- UI layer -------------------------------------------------------------------
C(name="BasePage", layer="UI", kind="UI",
  pkg="com.testhub.pages", path=ROOT + "/ui/java/com/testhub/pages/BasePage.java",
  ext="abstract class",
  used="every page object and component extends it",
  deps="%s, %s, %s" % (L("DriverManager"), L("WaitUtils"), L("JavaScriptUtils")),
  summary="The keyword layer: centralises low-level Selenium so concrete pages read as business intent, "
          "never raw findElement/click. Every interaction waits explicitly first. click() falls back to a "
          "JS click if an overlay intercepts. Includes the two shared locator builders that exploit the "
          "app's markup: fieldByLabel(label) (label -> following input/textarea/select) and buttonByText(text).",
  methods=[
      ("click(locator|element)", "waitForClickable -> click; JS-click fallback on interception."),
      ("type(locator, text)", "waitForVisible -> clear -> sendKeys."),
      ("getText / getValue / getTexts / findAll", "Read helpers."),
      ("selectByValue / selectByVisibleText", "Native <select> handling."),
      ("isDisplayed / isPresent / waitForReady", "State queries."),
      ("fieldByLabel(label) / buttonByText(text)", "Reusable XPath builders for the app's form markup."),
  ],
  snippet="""
protected void click(By locator) {
    WebElement element = WaitUtils.waitForClickable(locator);
    try {
        element.click();
    } catch (ElementClickInterceptedException e) {
        // An overlay/animation got in the way - fall back to a JS click.
        JavaScriptUtils.clickWithJs(element);
    }
}""",
  snippet_title="BasePage.java - resilient click")

C(name="BaseAppPage", layer="UI", kind="UI",
  pkg="com.testhub.pages", path=ROOT + "/ui/java/com/testhub/pages/BaseAppPage.java",
  ext="abstract, extends BasePage",
  used="every authenticated page (Dashboard, Projects, detail pages)",
  summary="Base for every page behind login. Exposes the app shell shared by all of them - navbar(), "
          "sidebar() and modal() - so individual pages never re-declare the chrome.")

C(name="NavbarComponent", layer="UI", kind="UI",
  pkg="com.testhub.pages.components", path=ROOT + "/ui/java/com/testhub/pages/components/NavbarComponent.java",
  ext="extends BasePage",
  used="via BaseAppPage.navbar()",
  summary="Top bar: logout() (waits for the /login redirect), openHelp(), toggleTheme(), getRole() - reads "
          "the ADMIN/TESTER/VIEWER role chip, used by login tests to assert the signed-in role.")

C(name="SidebarComponent", layer="UI", kind="UI",
  pkg="com.testhub.pages.components", path=ROOT + "/ui/java/com/testhub/pages/components/SidebarComponent.java",
  ext="extends BasePage",
  used="via BaseAppPage.sidebar()",
  summary="Left navigation rail. Links are located by their stable hrefs (a[href='/projects'] etc.) rather "
          "than the responsive, duplicated label text. goToDashboard/Projects/TestCases/Users plus "
          "visibility checks used for RBAC assertions (isUsersLinkVisible).")

C(name="ModalComponent", layer="UI", kind="UI",
  pkg="com.testhub.pages.components", path=ROOT + "/ui/java/com/testhub/pages/components/ModalComponent.java",
  ext="extends BasePage",
  used="create/edit flows on Projects, Suites, Test Cases, Runs",
  summary="The shared create/edit dialog. Because only one modal is ever open, BasePage's label-scoped field "
          "lookups resolve unambiguously inside it. waitUntilOpen()/waitUntilClosed() bracket every modal "
          "interaction so tests never race the open/close animation.")

C(name="LoginPage", layer="UI", kind="UI",
  pkg="com.testhub.pages", path=ROOT + "/ui/java/com/testhub/pages/LoginPage.java",
  ext="extends BasePage",
  used="%s, %s; the wake-services hook is used by openLoginPage()" % (L("LoginTest"), L("BaseTest")),
  summary="The sign-in screen. Locators prefer the form's data-testid hooks (login-email, login-password, "
          "login-submit, wake-services, wake-status) - they survive styling changes far better than CSS "
          "classes. Also owns the cold-start helper wakeServicesAndWait(): clicks 'Services asleep? Wake "
          "them' and polls the status for up to 90 s until all services report awake. "
          "isEmailRejectedByBrowser() detects native HTML5 validation (type=\"email\") blocking the submit - "
          "in that case no app error banner can appear.",
  methods=[
      ("open()", "GET base.url + /login, wait for the email input."),
      ("loginAs(email, password)", "Fill + submit + wait for the dashboard route -> DashboardPage."),
      ("submitLogin(email, password)", "Fill + submit without asserting the outcome (negative tests)."),
      ("isErrorDisplayed() / getErrorMessage()", "App error banner."),
      ("isEmailRejectedByBrowser()", "checkValidity() on the email input via JS."),
      ("wakeServicesAndWait() / getWakeStatus()", "Free-tier cold-start wake flow."),
      ("goToRegister()", "'Create an account' link -> RegisterPage."),
  ])

C(name="RegisterPage", layer="UI", kind="UI",
  pkg="com.testhub.pages", path=ROOT + "/ui/java/com/testhub/pages/RegisterPage.java",
  ext="extends BasePage",
  used="%s, %s.signUpFreshUser, the E2E journey" % (L("RegisterTest"), L("BaseTest")),
  summary="The account-creation screen. Fields have no test ids, so they are located by their visible labels "
          "(Name / Email / Password / Confirm password) via BasePage.fieldByLabel. registerAndLogin() "
          "auto-confirms the password, submits and waits for the dashboard route - the UI-only way every "
          "fresh user in this suite is born.",
  methods=[
      ("open()", "GET /register, wait for the Name field."),
      ("submit(name, email, password, confirm)", "Fill all four fields + submit (no outcome assertion)."),
      ("registerAndLogin(name, email, password)", "Happy path -> DashboardPage."),
      ("isErrorDisplayed() / getErrorMessage()", "Client-side validation banner."),
      ("goToLogin()", "'Log in' link back to sign-in."),
  ])

C(name="DashboardPage", layer="UI", kind="UI",
  pkg="com.testhub.pages", path=ROOT + "/ui/java/com/testhub/pages/DashboardPage.java",
  ext="extends BaseAppPage",
  used="login/register flows land here; %s; both hybrid tests" % L("DashboardTest"),
  summary="The landing dashboard: KPI stat cards, result-breakdown filter, recent runs. "
          "waitUntilLoaded() waits for the 'Dashboard' heading with the longer page-load budget because the "
          "heading only renders once the stats fetch resolves (absorbing a cold core-service). "
          "getStatValue(title) reads a KPI card ('Projects', 'Runs', 'Pass Rate') by its eyebrow title's "
          "sibling value.",
  methods=[
      ("open() / waitUntilLoaded() / isLoaded()", "Navigation + load gates."),
      ("getStatValue(title)", "KPI card value by card title."),
      ("filterByResult(status) / isResultFilterPanelVisible(status)", "Result-breakdown legend filter."),
      ("refresh() / hasRecentRuns()", "Misc."),
  ])

C(name="ProjectsPage", layer="UI", kind="UI",
  pkg="com.testhub.pages", path=ROOT + "/ui/java/com/testhub/pages/ProjectsPage.java",
  ext="extends BaseAppPage",
  used="%s, E2E, %s (hybrid verification)" % (L("ProjectsTest"), L("ApiLoginExistingUserTest", color=HYB)),
  summary="The projects grid + create-project modal. createProject() opens the modal, fills Name/Description "
          "by label, submits and waits for the new card to render. deleteProject() clicks the card's Delete, "
          "accepts the native window.confirm via %s, then waits for the card to disappear. Cards are located "
          "by an XPath keyed on the project's (unique) name." % L("AlertUtils"),
  methods=[
      ("open() / isLoaded()", "GET /projects, wait for heading + page-ready."),
      ("createProject(name, description)", "Full create flow through the modal."),
      ("isProjectVisible(name) / getProjectStatus(name)", "Card presence + ACTIVE badge."),
      ("openProject(name)", "Card click -> ProjectDetailPage."),
      ("deleteProject(name)", "Delete + confirm + wait for removal."),
  ])

C(name="ProjectDetailPage", layer="UI", kind="UI",
  pkg="com.testhub.pages", path=ROOT + "/ui/java/com/testhub/pages/ProjectDetailPage.java",
  ext="extends BaseAppPage",
  used="E2E journey, %s" % L("ProjectsTest"),
  summary="A project's suites view ('Test Suites' heading). getProjectId() parses the id from the URL - the "
          "E2E test uses it to open the runs page. createSuite() drives the modal; openSuite(name) descends "
          "into a suite; goToRuns() jumps to the project's runs.",
  methods=[
      ("open(projectId) / waitUntilLoaded() / isLoaded()", "Navigation + load gates."),
      ("getProjectId()", "Project id from the current URL."),
      ("createSuite(name, description) / isSuiteVisible / openSuite / deleteSuite", "Suite CRUD."),
      ("goToRuns()", "-> TestRunsPage."),
  ])

C(name="SuiteDetailPage", layer="UI", kind="UI",
  pkg="com.testhub.pages", path=ROOT + "/ui/java/com/testhub/pages/SuiteDetailPage.java",
  ext="extends BaseAppPage",
  used="E2E journey",
  summary="A suite's test-case list ('Test Cases' heading). createTestCase() fills title, description, "
          "steps, expected and the Priority select inside the modal; getPriority(title) reads a case's "
          "priority chip back for round-trip assertions.",
  methods=[
      ("open(suiteId) / waitUntilLoaded() / isLoaded()", "Navigation + load gates."),
      ("createTestCase(title, desc, steps, expected, priority)", "Full create flow."),
      ("isTestCaseVisible(title) / getPriority(title) / getVisibleCaseCount()", "Reads."),
      ("deleteTestCase(title)", "Delete flow."),
  ])

C(name="TestRunsPage", layer="UI", kind="UI",
  pkg="com.testhub.pages", path=ROOT + "/ui/java/com/testhub/pages/TestRunsPage.java",
  ext="extends BaseAppPage",
  used="E2E journey",
  summary="A project's runs ('Test Runs' heading) with the two-step create wizard: createRun() fills "
          "name/description, clicks 'Next: Choose Test Cases', ticks each case by title, then submits via "
          "the 'Create Run (n)' button. Run cards support status change (setRunStatus) and deletion.",
  methods=[
      ("open(projectId) / waitUntilLoaded() / isLoaded()", "Navigation + load gates."),
      ("createRun(name, description, caseTitles)", "Two-step wizard."),
      ("isRunVisible / openRun(name)", "Card presence / -> RunDetailPage."),
      ("setRunStatus(runName, status) / getRunStatusBadge / deleteRun", "Card-level actions."),
  ])

C(name="RunDetailPage", layer="UI", kind="UI",
  pkg="com.testhub.pages", path=ROOT + "/ui/java/com/testhub/pages/RunDetailPage.java",
  ext="extends BaseAppPage",
  used="E2E journey",
  summary="Inside one run: mark each case PASS/FAIL/SKIP/BLOCKED (markResult), read the per-case status and "
          "the summary counters (getSummaryCount('PASS')), change the run's own status via the Run Status "
          "select, and add more cases to a running run through the Add Test Cases modal.",
  methods=[
      ("open(runId) / waitUntilLoaded() / isLoaded()", "Navigation + load gates."),
      ("markResult(caseTitle, status) / getResultStatus(caseTitle)", "The core upsert-result flow."),
      ("getSummaryCount(key)", "PASS/FAIL/... counters."),
      ("setRunStatus(status) / getRunStatus()", "Run lifecycle."),
      ("openAddCasesModal / addCaseByTitle / goBackToRuns", "Add cases + navigation."),
  ])

C(name="BaseTest", layer="UI", kind="UI",
  pkg="com.testhub.tests", path=ROOT + "/ui/java/com/testhub/tests/BaseTest.java",
  ext="abstract class - @Listeners(TestListener.class)",
  used="every UI test class + (via %s) the hybrid tests" % L("HybridBaseTest", color=HYB),
  deps="%s, %s, %s, %s, %s" % (L("DriverFactory"), L("DriverManager"), L("LoginPage"), L("RegisterPage"), L("ScreenshotUtils")),
  summary="Shared lifecycle for every UI test. @BeforeSuite creates the output folders; @BeforeMethod "
          "creates a fresh per-thread driver; @AfterMethod captures the screenshot BEFORE quitting (and "
          "attaches it to Allure while the test case is still open), then quits. Authentication is "
          "<b>browser-only</b>: signUpFreshUser() drives the register form, loginViaUi() the login form, and "
          "signInTester() picks between the standing tester account (reuse.user=true, default - no "
          "registration, never throttled) and a fresh sign-up. The first visit to the login page wakes "
          "cold-start services exactly once per suite (double-checked, parallel-safe).",
  methods=[
      ("prepareSuite()  [@BeforeSuite]", "mkdir test-output/{screenshots,reports,downloads}."),
      ("setUp()  [@BeforeMethod]", "DriverFactory.createDriver() - one browser per test, per thread."),
      ("tearDown(result)  [@AfterMethod]", "ScreenshotUtils.captureAndStore() -> Allure attachment -> quitDriver()."),
      ("openLoginPage() / openRegisterPage()", "Navigation + one-time service wake-up."),
      ("signUpFreshUser()", "Register-form sign-up -> DashboardPage."),
      ("loginViaUi(email, password)", "Login-form sign-in -> DashboardPage."),
      ("signInTester()", "reuse.user ? standing tester login : fresh sign-up."),
      ("loginAsAdmin()", "Login form with admin.email/admin.password."),
  ],
  snippet="""
protected DashboardPage signInTester() {
    if (ConfigManager.reuseUser()) {
        return loginViaUi(ConfigManager.testerEmail(), ConfigManager.testerPassword());
    }
    return signUpFreshUser();
}""",
  snippet_title="BaseTest.java - fresh vs existing user")

C(name="LoginTest", layer="UI", kind="UI",
  pkg="com.testhub.tests.ui", path=ROOT + "/ui/java/com/testhub/tests/ui/LoginTest.java",
  ext="extends BaseTest",
  summary="Pure-UI authentication, 4 tests: <b>valid login</b> through the form (standing tester when "
          "reuse.user=true; otherwise register -> logout -> login, all UI); <b>invalid logins</b> "
          "data-driven from invalid-logins.json - server-rejected rows must show the app's error banner with "
          "the expected message, while the malformed-email row is correctly blocked client-side by the "
          "type=\"email\" HTML5 validation (asserted via isEmailRejectedByBrowser()); <b>empty credentials</b> "
          "shows a validation error; the <b>'Create an account'</b> link routes to /register.")

C(name="RegisterTest", layer="UI", kind="UI",
  pkg="com.testhub.tests.ui", path=ROOT + "/ui/java/com/testhub/tests/ui/RegisterTest.java",
  ext="extends BaseTest",
  summary="Pure-UI registration, 5 tests: happy-path sign-up lands signed-in on the dashboard; mismatched "
          "passwords blocked client-side ('do not match'); short password rejected ('at least 6'); missing "
          "name rejected ('name is required'); the 'Log in' link routes back to /login.")

C(name="ProjectsTest", layer="UI", kind="UI",
  pkg="com.testhub.tests.ui", path=ROOT + "/ui/java/com/testhub/tests/ui/ProjectsTest.java",
  ext="extends BaseTest",
  summary="Pure-UI project CRUD, 3 tests, signed in per-method via signInTester(). Create: new project "
          "appears in the grid with status ACTIVE. Delete: the confirm dialog is accepted and the card "
          "disappears. Open: clicking the card lands on the project's Test Suites view. Unique names mean a "
          "standing account's existing data never collides.")

C(name="DashboardTest", layer="UI", kind="UI",
  pkg="com.testhub.tests.ui", path=ROOT + "/ui/java/com/testhub/tests/ui/DashboardTest.java",
  ext="extends BaseTest",
  summary="Pure-UI dashboard check for a genuinely fresh account: signs up through the form (always - this "
          "test ignores reuse.user because it asserts exact zero counts) and verifies the KPI cards render "
          "with Projects = 0 and Runs = 0.")

C(name="EndToEndWorkflowTest", layer="UI", kind="UI",
  pkg="com.testhub.tests.e2e", path=ROOT + "/ui/java/com/testhub/tests/e2e/EndToEndWorkflowTest.java",
  ext="extends BaseTest",
  summary="The canonical product journey, 100% through the UI - no API shortcuts: register -> create project "
          "-> create suite -> create CRITICAL test case -> create run containing it (two-step wizard) -> "
          "mark it PASS -> verify the run summary -> open the dashboard and assert Projects = 1, Runs = 1, "
          "Pass Rate = 100%. This one test exercises almost every page object in the suite.")

# ---- HYBRID layer ----------------------------------------------------------------
C(name="HybridBaseTest", layer="HYBRID", kind="HYBRID",
  pkg="com.testhub.tests.hybrid", path=ROOT + "/hybrid/java/com/testhub/tests/hybrid/HybridBaseTest.java",
  ext="abstract, extends BaseTest",
  used="both hybrid tests",
  deps="%s, %s, %s" % (L("ApiClient", color=APIC), L("JavaScriptUtils"), L("FrameworkConstants")),
  summary="Base for the hybrid tests: a @BeforeClass gateway warm-up plus <b>the one bridging step that "
          "defines this layer</b> - injectApiSession(auth) takes the tokens an API login returned, navigates "
          "the browser to the app origin (localStorage is origin-scoped), writes accessToken/refreshToken "
          "into localStorage, and reloads on the dashboard route. The SPA reads the tokens and is signed in "
          "without ever seeing the login form. This bridge exists in exactly one place.",
  snippet="""
protected void injectApiSession(AuthResponse auth) {
    if (auth.user != null && auth.user.email != null)
        ExtentManager.setRunUser(auth.user.email);
    // Must be on the app origin before localStorage is writable.
    DriverManager.getDriver().get(ConfigManager.baseUrl() + FrameworkConstants.ROUTE_LOGIN);
    JavaScriptUtils.setLocalStorage(FrameworkConstants.LS_ACCESS_TOKEN, auth.accessToken);
    JavaScriptUtils.setLocalStorage(FrameworkConstants.LS_REFRESH_TOKEN, auth.refreshToken);
    DriverManager.getDriver().get(ConfigManager.baseUrl() + FrameworkConstants.ROUTE_DASHBOARD);
}""",
  snippet_title="HybridBaseTest.java - the API->browser session bridge")

C(name="ApiLoginDashboardTest", layer="HYBRID", kind="HYBRID",
  pkg="com.testhub.tests.hybrid", path=ROOT + "/hybrid/java/com/testhub/tests/hybrid/ApiLoginDashboardTest.java",
  ext="extends HybridBaseTest",
  summary="Hybrid test #1 - <b>fresh user</b>. Registers a brand-new account over the API, seeds TWO "
          "projects over the API (milliseconds, zero clicks), bridges the session into the browser, then "
          "verifies <b>through the real UI</b> that the dashboard's Projects KPI reads exactly '2'. A fresh "
          "account is required because the assertion relies on an exact count. Note: registration is "
          "throttled on the live free tier (HTTP 429 under bursty runs) - see the throttle-free variant below.")

C(name="ApiLoginExistingUserTest", layer="HYBRID", kind="HYBRID",
  pkg="com.testhub.tests.hybrid", path=ROOT + "/hybrid/java/com/testhub/tests/hybrid/ApiLoginExistingUserTest.java",
  ext="extends HybridBaseTest",
  summary="Hybrid test #2 - <b>existing user</b>, in the smoke group. Logs in over the API as the standing "
          "tester (tester.email/tester.password - no registration, so it never touches the throttled "
          "endpoint), seeds one uniquely-named project over the API, bridges the session, verifies in the "
          "Projects UI that the project card is visible and the role chip reads TESTER - then deletes the "
          "project over the API in a finally block, leaving the standing account clean.",
  snippet="""
AuthResponse auth = api.login(ConfigManager.testerEmail(), ConfigManager.testerPassword());
String projectName = TestDataFactory.projectName();
ProjectDto project = api.createProject(projectName, "seeded via API (existing user)");
try {
    injectApiSession(auth);
    ProjectsPage projects = new ProjectsPage().open();
    Assert.assertTrue(projects.isProjectVisible(projectName),
            "The API-seeded project should be visible in the Projects UI");
} finally {
    api.deleteProject(project.id);   // self-clean
}""",
  snippet_title="ApiLoginExistingUserTest.java - core flow (trimmed)")

# ================================ STORY ======================================
def build():
    doc = GuideDoc(OUT, pagesize=A4, leftMargin=M_L, rightMargin=M_R,
                   topMargin=M_T, bottomMargin=M_B,
                   title=DOC_TITLE, author="testhub-automation")
    frame_cover = Frame(M_L, M_B, BODY_W, PAGE_H - M_T - M_B, id="cover")
    frame_body = Frame(M_L, M_B, BODY_W, PAGE_H - M_T - M_B, id="body")
    doc.addPageTemplates([
        PageTemplate(id="Cover", frames=[frame_cover], onPage=draw_cover),
        PageTemplate(id="Body", frames=[frame_body], onPage=draw_body),
    ])

    story = []
    story.append(NextPageTemplate("Body"))
    story.append(PageBreak())

    # ---------------- TOC ----------------
    story.append(heading("Contents", S["H1"], "toc", 0, None))
    toc = TableOfContents()
    toc.levelStyles = [TOC_L0, TOC_L1]
    story.append(toc)
    story.append(PageBreak())

    # ================= CHAPTER 1: OVERVIEW =================
    story.append(H1("Overview", key="ch1"))
    story.append(H2("What this suite is"))
    story.append(P(
        "<b>testhub-automation</b> is a UI + API test automation framework for <b>testHub</b>, a "
        "test-management web app. It is built on Java 17, Selenium 4 (WebDriver), TestNG, RestAssured, "
        "with dual reporting (ExtentReports and Allure), Log4j2 logging and Maven as the build/runner. "
        "It runs the same against a local stack, the live deployment or CI - only "
        "<font face='Courier'>-D</font> flags change."))
    story.append(P(
        "The defining idea is a <b>clean split into three test layers</b>, color-coded throughout this guide:"))
    story.append(chip_par([("UI - browser only", "UI"), ("API - RestAssured only", "API"),
                           ("HYBRID - API seeds, UI verifies", "HYBRID")]))
    story.append(Spacer(1, 4))
    story.append(tbl(
        ["Layer", "Logs in via", "Talks to", "Lives in"],
        [["<font color='#2563EB'><b>UI</b></font>", "the real login/register forms (browser only)",
          "the app like a human user", "src/ui"],
         ["<font color='#15803D'><b>API</b></font>", "POST /api/auth/login|register (RestAssured)",
          "the gateway directly - no browser at all", "src/api"],
         ["<font color='#C2410C'><b>HYBRID</b></font>", "the API, then injects tokens into the browser",
          "API for setup speed, UI for verification", "src/hybrid"]],
        [55, 175, 175, BODY_W - 405]))

    story.append(H2("The app under test"))
    story.append(P(
        "testHub is a small microservices product: a <b>React SPA</b> (Vercel) talks to an <b>API "
        "gateway</b> (Render), which fronts an <b>auth service</b> (register/login/JWT) and a <b>core "
        "service</b> (projects, suites, test cases, runs, results) backed by Postgres. It is hosted on a "
        "<b>free tier</b>: services fall asleep and cold-start in ~24 s+, and "
        "<font face='Courier'>/api/auth/register</font> is rate-limited (HTTP 429) under bursty traffic. "
        "Both facts shaped the framework - generous 40 s explicit waits, a wake-services flow, a one-shot "
        "retry, and an existing-account login strategy."))
    arch_w = BODY_W
    bx = {
        "mvn":   Box(0,   228, 92, 34, "NEUT", "Maven + Surefire", "mvn test -P<profile>"),
        "tng":   Box(112, 228, 92, 34, "NEUT", "TestNG", "suite XML + listeners"),
        "ui":    Box(224, 268, 100, 30, "UI", "UI tests", "src/ui", ),
        "hyb":   Box(224, 228, 100, 30, "HYBRID", "HYBRID tests", "src/hybrid"),
        "api":   Box(224, 188, 100, 30, "API", "API tests", "src/api"),
        "sel":   Box(354, 252, 88, 32, "UI", "Selenium 4", "ChromeDriver..."),
        "ra":    Box(354, 188, 88, 32, "API", "RestAssured", "ApiClient"),
        "spa":   Box(462, 252, 80, 32, "NEUT", "React SPA", "Vercel"),
        "gw":    Box(462, 188, 80, 32, "NEUT", "API gateway", "Render"),
        "auth":  Box(420, 120, 78, 30, "NEUT", "auth-service", "JWT"),
        "core":  Box(508, 120, 78, 30, "NEUT", "core-service", "domain"),
        "db":    Box(464, 58, 80, 28, "NEUT", "Postgres", ""),
    }
    arrows = [
        (92, 245, 112, 245), (204, 245, 224, 245),
        (324, 283, 354, 272), (324, 243, 354, 262),  # ui/hyb -> selenium
        (324, 243, 354, 210), (324, 203, 354, 203),  # hyb/api -> restassured
        (442, 268, 462, 268), (442, 203, 462, 203),
        (502, 252, 472, 150), (502, 252, 535, 150),  # spa -> services? (via gw) simplified
        (502, 188, 459, 150), (502, 188, 547, 150),
        (459, 120, 495, 86), (547, 120, 513, 86),
    ]
    story.append(Spacer(1, 4))
    story.append(Diagram(arch_w, 310,
                         list(bx.values()), arrows,
                         title="High-level architecture - framework (left) drives the app (right); SPA traffic also flows through the gateway"))
    story.append(P("The SPA box is what UI tests drive with Selenium; the gateway box is what the API layer "
                   "calls with RestAssured. Hybrid tests use both paths in one test.", "Small"))

    story.append(H2("The domain-split layout (and why)"))
    story.append(P(
        "Instead of Maven's classic <font face='Courier'>src/main/java</font> + "
        "<font face='Courier'>src/test/java</font>, the project is split <b>by domain</b>. Four source "
        "roots are registered with the build-helper-maven-plugin, so packages stay normal "
        "(<font face='Courier'>com.testhub.*</font>) while the folders give instant orientation: "
        "everything UI is under src/ui, everything API under src/api, shared plumbing under src/common, "
        "and the API-assisted tests are isolated - visibly - in src/hybrid."))
    tree = [
        (0, "testhub-automation/", "NEUT", True, None, None),
        (1, "pom.xml", "NEUT", False, None, "deps, 6 run profiles, build-helper source roots, Allure"),
        (1, "src/common/java/com/testhub/", "COMMON", True, None, "shared core - used by every layer"),
        (2, "config/  constants/  driver/  enums/  exceptions/", "COMMON", False, "cls_ConfigManager", None),
        (2, "utils/  reports/  listeners/  tests/data/", "COMMON", False, "cls_WaitUtils", None),
        (1, "src/api/java/com/testhub/", "API", True, None, "independent - never imports UI code"),
        (2, "api/ApiClient.java  +  api/models/ (6 DTOs)", "API", False, "cls_ApiClient", None),
        (2, "tests/api/  (ApiBaseTest, AuthApiTest, ProjectApiTest)", "API", False, "cls_ApiBaseTest", None),
        (1, "src/ui/java/com/testhub/", "UI", True, None, "page objects + pure-UI tests"),
        (2, "pages/  (BasePage, 8 pages, 3 components)", "UI", False, "cls_BasePage", None),
        (2, "tests/BaseTest.java  +  tests/ui/  +  tests/e2e/", "UI", False, "cls_BaseTest", None),
        (1, "src/hybrid/java/com/testhub/tests/hybrid/", "HYBRID", True, None, "the ONLY API-assisted UI tests"),
        (2, "HybridBaseTest  ApiLoginDashboardTest  ApiLoginExistingUserTest", "HYBRID", False, "cls_HybridBaseTest", None),
        (1, "src/resources/", "NEUT", True, None, "config + suites + test data + log4j2"),
        (2, "config/config.properties   suites/ (6 TestNG XMLs)", "NEUT", False, None, None),
        (2, "testdata/ (invalid-logins.json, testcases.json, testcases.csv)", "NEUT", False, None, None),
    ]
    story.append(TreeDiagram(tree))
    story.append(P("Boxes are clickable - they jump to the matching class page in chapter 2.", "Small"))

    story.append(H2("The three design rules"))
    story.append(tbl(["#", "Rule", "Enforced how"], [
        ["1", "<b>UI tests log in ONLY through the real browser forms.</b> No token shortcuts in src/ui.",
         "BaseTest offers only signUpFreshUser(), loginViaUi(), signInTester(), loginAsAdmin() - all drive LoginPage/RegisterPage."],
        ["2", "<b>The API layer is independent.</b> Nothing under src/api imports a page object or touches WebDriver.",
         "ApiClient + models + API tests depend only on RestAssured, Jackson and src/common."],
        ["3", "<b>Exactly the hybrid tests bridge the two.</b> If a test mixes API and browser, it lives in src/hybrid - nowhere else.",
         "The localStorage token bridge exists in one place: HybridBaseTest.injectApiSession()."],
    ], [18, 250, BODY_W - 268]))
    story.append(PageBreak())

    # ================= CHAPTER 2: CLASS REFERENCE =================
    story.append(H1("Every class, explained", key="ch2"))
    story.append(P(
        "One entry per class - what it does, its key public methods, who calls it and what it depends on. "
        "Underlined names are internal links. Entries are grouped by module; the side color of each header "
        "table shows the layer: slate = common, blue = UI, green = API, orange = HYBRID."))
    groups = [
        ("Configuration, constants & exceptions (src/common)", ["ConfigManager", "FrameworkConstants", "FrameworkException"]),
        ("Driver management (src/common)", ["DriverFactory", "DriverManager"]),
        ("Enums (src/common)", ["BrowserType", "Priority", "ResultStatus", "RunStatus", "Role"]),
        ("Utilities (src/common)", ["WaitUtils", "JavaScriptUtils", "AlertUtils", "ScreenshotUtils",
                                    "JsonDataReader", "ExcelDataReader", "FileDownloadUtils", "TestDataFactory"]),
        ("Reporting & listeners (src/common)", ["ExtentManager", "TestListener", "RetryAnalyzer", "RetryTransformer"]),
        ("Test data (src/common)", ["DataProviders", "LoginData", "TestCaseData"]),
        ("API layer (src/api)", ["ApiClient", "AuthResponse", "UserDto", "ProjectDto", "SuiteDto",
                                 "TestCaseDto", "RunDto", "ApiBaseTest", "AuthApiTest", "ProjectApiTest"]),
        ("UI layer - page objects (src/ui)", ["BasePage", "BaseAppPage", "NavbarComponent", "SidebarComponent",
                                              "ModalComponent", "LoginPage", "RegisterPage", "DashboardPage",
                                              "ProjectsPage", "ProjectDetailPage", "SuiteDetailPage",
                                              "TestRunsPage", "RunDetailPage"]),
        ("UI layer - tests (src/ui)", ["BaseTest", "LoginTest", "RegisterTest", "ProjectsTest",
                                       "DashboardTest", "EndToEndWorkflowTest"]),
        ("HYBRID layer (src/hybrid)", ["HybridBaseTest", "ApiLoginDashboardTest", "ApiLoginExistingUserTest"]),
    ]
    by_name = {d["name"]: d for d in CLS}
    for title, names in groups:
        story.append(H2(title))
        for n in names:
            story.extend(class_block(by_name[n]))
    story.append(PageBreak())

    # ================= CHAPTER 3: EXECUTION FLOW =================
    story.append(H1("Execution flow - start to finish", key="ch3"))
    story.append(H2("From `mvn test` to TestNG"))
    story.append(P(
        "Everything starts on the command line. The Maven profile only chooses which TestNG suite XML "
        "Surefire runs; the XML then decides packages, groups, parallelism and listeners:"))
    story.append(code("""
mvn test -Pui          ->  src/resources/suites/ui.xml        (parallel=classes, 3 threads)
mvn test -Papi         ->  src/resources/suites/api.xml       (parallel=classes, 3 threads)
mvn test -Phybrid      ->  src/resources/suites/hybrid.xml    (serial)
mvn test -Psmoke       ->  src/resources/suites/smoke.xml     (smoke groups, 2 threads)
mvn test               ->  src/resources/suites/regression.xml  (DEFAULT)
mvn test -Pfull        ->  src/resources/suites/full.xml      (everything)""",
        title="The entry point - profile selects the suite XML"))
    story.append(P(
        "Each suite XML registers two listeners before any test runs: " + L("TestListener") +
        " (reporting bridge) and " + L("RetryTransformer") + " (attaches " + L("RetryAnalyzer") +
        " to every @Test). Allure's own TestNG listener registers itself automatically from the "
        "allure-testng jar. Surefire also starts the JVM with the AspectJ weaver agent so Allure "
        "annotations work."))

    story.append(H2("The shared test lifecycle, numbered"))
    story.append(P(
        "For every UI/hybrid test method, this is the exact order of events (API tests skip the browser "
        "steps - their diagram follows):"))
    story.append(tbl(["#", "Phase", "What happens (class responsible)"], [
        ["1", "@BeforeSuite", "BaseTest.prepareSuite() creates test-output/{screenshots, reports, downloads}."],
        ["2", "Suite start", "TestListener.onStart() initialises ExtentReports (archives the previous run's report)."],
        ["3", "@BeforeMethod", "BaseTest.setUp() -> DriverFactory.createDriver(): browser launched, registered per-thread in DriverManager."],
        ["4", "onTestStart", "TestListener creates the ExtentTest node (title, description, groups, parameters)."],
        ["5", "Test body", "Page objects -> BasePage actions -> WaitUtils explicit waits -> TestNG assertions. Sign-in is via the real forms (BaseTest helpers)."],
        ["6", "@AfterMethod", "BaseTest.tearDown(): ScreenshotUtils.captureAndStore() (driver still alive!) -> Allure attachment if failed/skipped (or always when screenshot.on.success=true) -> DriverManager.quitDriver()."],
        ["7", "Listener verdict", "TestListener.onTestSuccess/Failure/Skipped: PASS/FAIL/SKIP + duration + reason + stack trace + the stored screenshot into Extent."],
        ["8", "Retry (only on failure)", "RetryAnalyzer re-queues the test once (retry.count=1); the failed attempt is marked retried/skipped; steps 3-7 repeat."],
        ["9", "Suite finish", "TestListener.onFinish() -> ExtentManager.flush(): report copied to test-output/reports/Latest/Report-<timestamp>_<user>.html. Allure results are already in target/allure-results/."],
    ], [16, 92, BODY_W - 108]))

    story.append(PageBreak())
    story.append(H2("Flow diagram - a pure UI test"))
    story.append(P("Example: ProjectsTest.shouldCreateProject(). Click any box to jump to the class.", "Small"))
    story.append(FlowDiagram([
        dict(title="mvn test -Pui  ->  Surefire  ->  ui.xml (parallel=classes x3)", sub="listeners: TestListener + RetryTransformer", kind="NEUT"),
        dict(title="@BeforeSuite  BaseTest.prepareSuite()", sub="create test-output folders", kind="UI", link="cls_BaseTest"),
        dict(title="@BeforeMethod  DriverFactory.createDriver()", sub="browser per test, stored in ThreadLocal DriverManager", kind="UI", link="cls_DriverFactory"),
        dict(title="signInTester()  ->  REAL login form", sub="LoginPage.loginAs(tester) - or sign-up form when reuse.user=false; first visit wakes services", kind="UI", link="cls_LoginPage"),
        dict(title="ProjectsPage.open().createProject(name, desc)", sub="modal -> fieldByLabel -> submit -> wait for the new card", kind="UI", link="cls_ProjectsPage"),
        dict(title="Assertions", sub="isProjectVisible(name) + status badge == ACTIVE", kind="UI"),
        dict(title="@AfterMethod  screenshot THEN quit", sub="ScreenshotUtils.captureAndStore() -> Allure attach -> quitDriver()", kind="UI", link="cls_ScreenshotUtils"),
        dict(title="TestListener verdict -> Extent + Allure", sub="PASS/FAIL + duration + screenshot; RetryAnalyzer re-runs once on failure", kind="COMMON", link="cls_TestListener"),
        dict(title="END: reports written", sub="test-output/reports/Latest/Report-*.html  +  target/allure-results/", kind="NEUT"),
    ], title="UI test - browser only, login through the form"))

    story.append(PageBreak())
    story.append(H2("Flow diagram - a pure API test"))
    story.append(P("Example: ProjectApiTest.buildsProjectSuiteCaseGraph(). No browser exists at any point.", "Small"))
    story.append(FlowDiagram([
        dict(title="mvn test -Papi  ->  Surefire  ->  api.xml", sub="same listeners; no DriverFactory anywhere", kind="NEUT"),
        dict(title="@BeforeClass  ApiBaseTest.warmUp()", sub="poll gateway /health up to 8 x 3 s (cold-start shield)", kind="API", link="cls_ApiBaseTest"),
        dict(title="@BeforeMethod  client.register(fresh user)", sub="POST /api/auth/register -> bearer token stored in the ApiClient", kind="API", link="cls_ApiClient"),
        dict(title="createProject -> createSuite -> createTestCase", sub="three REST calls build the domain graph in milliseconds", kind="API", link="cls_ApiClient"),
        dict(title="Assertions on DTOs", sub="suite.projectId == project.id; tc.priority == \"HIGH\" (Jackson-mapped POJOs)", kind="API", link="cls_ProjectDto"),
        dict(title="ensure2xx() guards every call", sub="non-2xx -> FrameworkException with HTTP status + body", kind="API", link="cls_ApiClient"),
        dict(title="TestListener verdict -> Extent + Allure", sub="no screenshot (DriverManager.hasDriver() is false)", kind="COMMON", link="cls_TestListener"),
        dict(title="END: same two reports", sub="API tests appear alongside UI tests in Extent and Allure", kind="NEUT"),
    ], title="API test - RestAssured only, no browser"))

    story.append(PageBreak())
    story.append(H2("Flow diagram - the hybrid test"))
    story.append(P("Example: ApiLoginExistingUserTest. Green steps are API, blue steps are UI - the orange "
                   "step is the bridge that makes it hybrid.", "Small"))
    story.append(FlowDiagram([
        dict(title="mvn test -Phybrid  ->  hybrid.xml (serial)", sub="hybrid tests extend HybridBaseTest extends BaseTest", kind="NEUT"),
        dict(title="@BeforeClass warm-up + @BeforeMethod browser", sub="gateway health poll; DriverFactory still creates a browser (it is a UI-verifying test)", kind="HYBRID", link="cls_HybridBaseTest"),
        dict(title="API LOGIN: api.login(tester.email, tester.password)", sub="existing standing account - the throttled register endpoint is never touched", kind="API", link="cls_ApiClient"),
        dict(title="API SEED: api.createProject(uniqueName)", sub="data exists in milliseconds - zero clicks", kind="API", link="cls_ApiClient"),
        dict(title="BRIDGE: injectApiSession(auth)", sub="open /login origin -> localStorage.setItem(accessToken, refreshToken) -> open /", kind="HYBRID", link="cls_HybridBaseTest"),
        dict(title="UI VERIFY: ProjectsPage.open()", sub="real browser, signed in without the form: project card visible, role chip TESTER", kind="UI", link="cls_ProjectsPage"),
        dict(title="API CLEAN-UP (finally): api.deleteProject(id)", sub="the standing account keeps no leftovers", kind="API", link="cls_ApiClient"),
        dict(title="Same tail: screenshot -> quit -> listener -> reports", sub="identical to the UI flow from here on", kind="COMMON", link="cls_TestListener"),
    ], title="HYBRID test - API for speed, UI for truth"))

    story.append(H2("Where exactly the three flows differ"))
    story.append(tbl(["Aspect", "UI", "API", "HYBRID"], [
        ["Browser", "yes - the whole test", "never", "yes - for verification"],
        ["Login", "real login/register form", "POST /api/auth/* only", "API login, tokens injected into localStorage"],
        ["Data setup", "clicks through the UI", "REST calls", "REST calls (seed) before UI checks"],
        ["Base class", "BaseTest", "ApiBaseTest", "HybridBaseTest (extends BaseTest)"],
        ["Speed", "slowest, most realistic", "fastest", "fast setup + realistic check"],
        ["Folder", "src/ui", "src/api", "src/hybrid"],
    ], [88, 138, 128, BODY_W - 354]))
    story.append(P(
        "Why this matters: hybrid setup skips up to six screens of clicking before the assertion, which "
        "makes the test faster AND less flaky - while the thing being verified is still the real UI. And "
        "because the seeding endpoints are themselves covered by the pure API tests, a seeding bug cannot "
        "hide."))
    story.append(PageBreak())

    # ================= CHAPTER 4: HOW TO RUN =================
    story.append(H1("How to run it", key="ch4"))
    story.append(H2("Prerequisites"))
    story.append(tbl(["Requirement", "Notes"], [
        ["JDK 17+", "pom sets maven.compiler.release=17."],
        ["Maven 3.9+", "mvn -version to verify."],
        ["Chrome / Edge / Firefox installed", "No driver downloads - Selenium Manager fetches the matching driver automatically on first run."],
    ], [150, BODY_W - 150]))

    story.append(H2("Commands - profiles and overrides"))
    story.append(code("""
cd automation/testhub-automation

mvn test                # DEFAULT = regression.xml  (UI smoke+regression, all API, hybrid)
mvn test -Pui           # pure-UI tests only
mvn test -Papi          # pure-API tests only (no browser)
mvn test -Phybrid       # the two API-assisted UI tests
mvn test -Psmoke        # fast smoke set across all layers
mvn test -Pfull         # everything

# Common overrides (combine freely)
mvn test -Pui  -Dheadless=true                 # CI-style headless Chrome
mvn test -Pui  -Dbrowser=firefox               # or edge
mvn test -Papi -Dreport.type=allure            # Allure only (extent | allure | both)
mvn test -Pui  -Dreuse.user=false              # force fresh sign-ups instead of the standing tester

# Point at a local stack instead of the live deployment
mvn test -Pui -Dbase.url=http://localhost:5173 -Dapi.base.url=http://localhost:3000

# Any specific suite XML
mvn test -DsuiteXmlFile=src/resources/suites/smoke.xml""",
        title="Every run command"))

    story.append(H2("Running from Eclipse"))
    story.append(tbl(["Step", "How"], [
        ["Import", "File > Import > Maven > Existing Maven Projects > select automation/testhub-automation. Project files (.classpath with the four source roots) are pre-configured."],
        ["Run a whole suite", "Right-click src/resources/suites/<name>.xml > Run As > TestNG Suite (requires the 'TestNG for Eclipse' plugin from the Marketplace)."],
        ["Run one class / method", "Right-click a test class > Run As > TestNG Test. Note: suite-level listeners come from the XML, but reporting still works because TestListener is also on BaseTest via @Listeners; retry only applies via suite XML runs."],
        ["Pass -D flags", "Run > Run Configurations > (your TestNG config) > Arguments > VM arguments, e.g. -Dheadless=true -Dreport.type=allure."],
    ], [105, BODY_W - 105]))

    story.append(H2("Where every artifact lands"))
    story.append(tbl(["Artifact", "Location", "How to view"], [
        ["Extent report", "test-output/reports/Latest/Report-<timestamp>_<user>.html (previous runs auto-moved to reports/archive/)", "Open the HTML file - fully self-contained, screenshots embedded"],
        ["Allure results", "target/allure-results/ (JSON + attachment PNGs)", "mvn allure:serve (opens browser) or mvn allure:report -> target/site/allure-maven-plugin/"],
        ["Failure screenshots (PNG)", "test-output/screenshots/", "Per-failure PNGs, timestamped"],
        ["Run log", "test-output/logs/automation.log", "Log4j2 - every action, wait and verdict"],
        ["Downloads under test", "test-output/downloads/", "Browser downloads are forced here by DriverFactory"],
        ["Surefire XML/TXT", "target/surefire-reports/", "CI-friendly TestNG output"],
    ], [120, 230, BODY_W - 350]))

    story.append(H2("Config reference - src/resources/config/config.properties"))
    story.append(P("Every key is overridable: <b>-Dkey=value</b> beats <b>ENV_VAR</b> beats the file "
                   "(resolution implemented in " + L("ConfigManager") + ")."))
    story.append(tbl(["Key", "Default", "What it changes"], [
        ["base.url", "https://mytesthub.vercel.app", "The SPA the browser opens. Local: http://localhost:5173"],
        ["api.base.url", "https://testhub-gateway.onrender.com", "Gateway for the RestAssured layer. Local: http://localhost:3000"],
        ["browser", "chrome", "chrome | firefox | edge"],
        ["headless", "false", "Headless mode; window forced to 1920x1080 so the desktop sidebar stays visible"],
        ["browser.arguments", "(empty)", "Extra comma-separated launch args"],
        ["window.size", "maximize", "maximize or <w>x<h> (headed runs)"],
        ["timeout.explicit", "40 (s)", "Every WaitUtils wait - generous to absorb ~24s cold starts"],
        ["timeout.pageload", "60 (s)", "Driver page-load timeout + dashboard load gate"],
        ["timeout.polling.millis", "1000", "Wait polling interval"],
        ["admin.email / admin.password", "admin14@gmail.com / (see file)", "Standing ADMIN - used by loginAsAdmin()"],
        ["tester.email / tester.password", "testuser1@gmail.com / (see file)", "Standing TESTER - used by signInTester() and the existing-user hybrid test"],
        ["reuse.user", "true", "true = UI tests log in as the standing tester (no registration, no throttle); false = fresh sign-up per test"],
        ["report.type", "both", "extent | allure | both - the reporting switch"],
        ["screenshot.on.failure", "true", "Embed screenshot on failure"],
        ["screenshot.on.success", "true", "Also screenshot passing tests (full visual audit)"],
        ["retry.count", "1", "RetryAnalyzer attempts after a failure; 0 disables"],
        ["warmup.enabled", "true", "Gateway health-poll warm-up before API suites; set false locally"],
    ], [128, 128, BODY_W - 256]))

    story.append(H2("Known constraint: the register throttle (HTTP 429)"))
    story.append(P(
        "The live deployment runs on free-tier infrastructure that <b>rate-limits "
        "<font face='Courier'>/api/auth/register</font></b>. Bursty registrations - parallel threads each "
        "signing up a fresh user, or several full runs back-to-back - trip it, and the block then persists "
        "for a cooldown window (observed up to ~15 minutes). A throttled call fails fast as "
        "<font face='Courier'>FrameworkException: API register failed (HTTP 429): Too Many Requests</font> - "
        "deliberately surfaced, not hidden, because it is a hosting limit, not a product bug."))
    story.append(P("<b>The strategy that avoids it</b> (default config): "
                   "<b>1)</b> reuse.user=true - UI tests sign in as the standing tester through the form, no "
                   "registration at all; <b>2)</b> the smoke-grouped hybrid test logs in as the existing "
                   "account over the API; <b>3)</b> tests that genuinely need a fresh account (DashboardTest "
                   "zero-KPIs, the E2E journey, hybrid #1) stay few and are spread across runs; "
                   "<b>4)</b> for unrestricted full-parallel runs, point at a local backend "
                   "(-Dbase.url / -Dapi.base.url) where no throttle exists."))
    story.append(PageBreak())

    # ================= CHAPTER 5: INTERVIEW =================
    story.append(H1("How to explain what I built", key="ch5"))
    story.append(P("Three scripts - one per layer - each with a 30-second pitch, a deeper walkthrough, and "
                   "the follow-up questions you are most likely to get, with strong answers."))

    story.append(H2("Explaining the UI framework"))
    story.append(P("<b>30-second pitch:</b>", "Body"))
    story.append(P(
        "\"I built a Page Object Model framework in Java 17 with Selenium 4 and TestNG for a React "
        "test-management app. Pages expose business intent - createProject, markResult - while one base "
        "page centralises resilient interactions: every action goes through explicit waits, there is no "
        "Thread.sleep and no implicit wait anywhere, and clicks fall back to JavaScript if an overlay "
        "intercepts. It runs three browsers, parallel by class with a ThreadLocal driver, is data-driven "
        "from JSON, CSV and Excel, and reports to ExtentReports and Allure with failure screenshots - "
        "switchable by one config key.\"", "Quote"))
    story.append(P("<b>Deeper walkthrough (2-3 min):</b> Structure first: a <b>keyword layer</b> "
                   "(BasePage: click/type/select with waits baked in), <b>components</b> for the app shell "
                   "(navbar, sidebar, shared modal) so pages never re-declare chrome, and <b>thin page "
                   "objects</b> on top. Locator strategy is deliberate: data-testid where the app provides "
                   "hooks (login form), stable hrefs for navigation, and label-based XPath builders "
                   "(fieldByLabel) exploiting the app's consistent form markup. Lifecycle: fresh browser per "
                   "test method, screenshot captured before driver.quit() because TestNG fires listeners "
                   "after @AfterMethod. Test data is generated unique per run (timestamp + random) so "
                   "parallel tests on a shared backend can never collide - and the suite can sign in either "
                   "as a standing account (default, avoids a free-tier register throttle) or with a fresh "
                   "sign-up per test for max isolation, one config flag."))
    story.append(tbl(["Likely follow-up", "Strong answer"], [
        ["Why ThreadLocal for the driver?",
         "TestNG runs classes on different threads (parallel=classes, 3 threads). A static driver would be shared and corrupted; ThreadLocal gives each thread its own isolated instance with zero locking. quitDriver() also removes the entry so threads do not leak drivers across tests."],
        ["How do you handle flakiness?",
         "Three layers: (1) every interaction waits explicitly for the right condition - no sleeps, so no timing guesses; (2) BasePage click falls back to a JS click when an overlay intercepts; (3) a one-shot RetryAnalyzer absorbs genuine infrastructure flakes (cold starts), while real failures still fail. Flaky-by-design things, like the app's 90 s wake-up flow, have their own dedicated handling in LoginPage."],
        ["Why no implicit waits?",
         "Implicit + explicit waits interact unpredictably (Selenium docs warn against mixing), and implicit waits hide real performance problems. Explicit conditions document exactly what each step needs - visible, clickable, URL changed - and fail with a precise message."],
        ["How is it data-driven?",
         "TestNG @DataProviders fed by external files: JSON (Jackson into typed POJOs like LoginData), CSV, and Excel via POI. The invalid-login test runs once per JSON row, and each row names its scenario so reports read like a test matrix."],
        ["What was the hardest UI bug?",
         "A 'malformed email' negative login failed because no app error banner appeared - the root cause was the input being type=\"email\", so the browser's native HTML5 validation blocked submission before the app could react. The fix asserted the real behavior: client-side rejection via checkValidity() instead of expecting a server banner."],
    ], [125, BODY_W - 125]))

    story.append(H2("Explaining the API framework"))
    story.append(P("<b>30-second pitch:</b>"))
    story.append(P(
        "\"Alongside the UI suite I built an independent RestAssured layer against the app's gateway: a "
        "typed ApiClient covering auth, projects, suites, test cases, runs and results, with Jackson POJO "
        "models and a fail-fast guard that turns any non-2xx into a readable exception with the status and "
        "body. Pure API tests cover registration, login, negative auth and the whole domain graph - and "
        "the same client doubles as the data-seeding engine for hybrid UI tests.\"", "Quote"))
    story.append(P("<b>Deeper walkthrough:</b> The client is instance-based: register()/login() store the "
                   "JWT on the instance, so an authenticated session is just an object you pass around - "
                   "clean for parallel tests, no static token state. Models are tolerant "
                   "(@JsonIgnoreProperties) so backend additions never break deserialisation. The API tests "
                   "deliberately exercise the exact endpoints the hybrid layer seeds with - if seeding "
                   "breaks, the API suite fails first and points at the real layer. There is also an "
                   "ops-aware touch: a health-poll warm-up before suites because the free-tier gateway "
                   "cold-starts, and 4xx responses are surfaced verbatim - which is how we caught the "
                   "register throttle as HTTP 429 rather than as a mystery timeout."))
    story.append(tbl(["Likely follow-up", "Strong answer"], [
        ["Why RestAssured?",
         "Industry standard for Java API testing: readable given/when/then specs, first-class Jackson integration, easy header/auth handling. I centralised the base spec (baseUri, JSON content type, bearer header) so tests never repeat plumbing."],
        ["How do you assert failures?",
         "ensure2xx throws FrameworkException carrying the HTTP code and response body; negative tests use Assert.expectThrows and check the message contains 401/400. One mechanism for transport errors everywhere."],
        ["Why are API tests browser-free?",
         "Speed and signal: they run in milliseconds, in parallel, with no rendering noise. A gateway regression fails here in seconds instead of surfacing as a confusing UI timeout."],
    ], [125, BODY_W - 125]))

    story.append(H2("Explaining the HYBRID layer"))
    story.append(P("<b>30-second pitch:</b>"))
    story.append(P(
        "\"The hybrid tests are the bridge: authenticate and seed data over the API in milliseconds, "
        "inject the JWTs into the browser's localStorage, and then verify through the real UI. One hybrid "
        "test registers a fresh user and proves the dashboard KPIs reflect two API-seeded projects; the "
        "other logs in as an existing account - completely avoiding a free-tier register throttle - seeds a "
        "project, verifies it in the UI, and deletes it again so the account stays clean. They live in "
        "their own source folder, so anyone can see at a glance which tests are API-assisted.\"", "Quote"))
    story.append(P("<b>Deeper walkthrough:</b> The pattern is 'seed over the API, verify through the UI'. A "
                   "pure UI test of 'dashboard reflects data' would click through six screens before the "
                   "assertion - slow and fragile. Instead HybridBaseTest.injectApiSession() navigates to the "
                   "app origin (localStorage is origin-scoped), writes accessToken/refreshToken - the same "
                   "keys the SPA itself uses - and reloads; the app boots signed-in. The bridge is one "
                   "protected method in one base class, so the 'UI tests never bypass the login form' rule "
                   "stays auditable: if a test imports ApiClient and a page object, it must live in "
                   "src/hybrid."))
    story.append(tbl(["Likely follow-up", "Strong answer"], [
        ["Why inject tokens instead of logging in through the UI?",
         "Login-through-the-form is covered - thoroughly - by the UI suite. Repeating it in every other test adds ~10 s and a flake point per test while verifying nothing new. Token injection makes test setup orthogonal to the login feature, exactly like API seeding makes it orthogonal to the create-project modal. The login feature itself still has dedicated UI coverage."],
        ["Why a separate src/hybrid folder?",
         "Discoverability and rule enforcement. The folder IS the documentation: pure UI suites stay honest (no hidden API shortcuts), and reviewers can spot a misplaced test by its imports alone."],
        ["Fresh vs existing user - why both hybrid tests?",
         "They demonstrate the trade-off: exact-count assertions (Projects KPI = 2) need a virgin account, so test #1 registers fresh - but that endpoint is throttled on the free tier. Test #2 shows the production-friendly pattern: existing account, relative assertions (my uniquely-named project is visible), and API clean-up in finally so it is rerunnable forever."],
        ["Is localStorage injection safe/realistic?",
         "It uses the app's own session mechanism - the same two keys the SPA writes after a real login - so the app behaves identically. It would not work for HttpOnly-cookie sessions; there I would reuse the API login response via Selenium CDP or a session-cookie injection instead. Knowing where the technique applies is part of the design."],
    ], [125, BODY_W - 125]))
    story.append(PageBreak())

    # ================= CHAPTER 6: CHEAT SHEET =================
    story.append(H1("One-page cheat sheet", key="ch6"))
    story.append(code("""
cd automation/testhub-automation
mvn test -Pui | -Papi | -Phybrid | -Psmoke | -Pfull        (no -P = regression)
   -Dheadless=true   -Dbrowser=firefox|edge   -Dreport.type=extent|allure|both
   -Dreuse.user=false          -Dbase.url=... -Dapi.base.url=...   (local stack)
Reports: test-output/reports/Latest/*.html   |   mvn allure:serve""",
        title="Commands"))
    half = (BODY_W - 10) / 2
    folder_map = Table([[
        Paragraph("<b>Folder map</b><br/>"
                  "<font face='Courier' size='7.6'>"
                  "src/common &nbsp;- config, driver, waits, utils,<br/>"
                  "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;reports, listeners, data<br/>"
                  "src/api &nbsp;&nbsp;&nbsp;&nbsp;- ApiClient + 6 DTOs + API tests<br/>"
                  "src/ui &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- BasePage + 8 pages + 3 components<br/>"
                  "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ BaseTest + 5 UI test classes<br/>"
                  "src/hybrid &nbsp;- HybridBaseTest + 2 hybrid tests<br/>"
                  "src/resources - config.properties, 6 suite<br/>"
                  "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;XMLs, testdata/</font>", S["Cell"]),
        Paragraph("<b>Golden rules</b><br/>"
                  "1. UI tests sign in via the real forms only.<br/>"
                  "2. src/api never imports UI code.<br/>"
                  "3. API + browser in one test? -> src/hybrid.<br/>"
                  "4. No sleeps - explicit waits only (40 s budget).<br/>"
                  "5. Test data is always unique (timestamp+random).<br/>"
                  "6. Screenshot BEFORE driver.quit().<br/>"
                  "7. reuse.user=true avoids the 429 register throttle.", S["Cell"]),
    ]], colWidths=[half, half])
    folder_map.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, LINE),
        ("BACKGROUND", (0, 0), (0, 0), TINT["NEUT"]),
        ("BACKGROUND", (1, 0), (1, 0), TINT["NEUT"]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(folder_map)
    story.append(Spacer(1, 8))
    story.append(tbl(["", "UI flow", "API flow", "HYBRID flow"], [
        ["1", "browser starts", "health warm-up", "browser starts + warm-up"],
        ["2", "REAL form login (signInTester)", "api.register/login (token in client)", "API login (existing tester)"],
        ["3", "click through pages", "REST calls build the graph", "API seeds data"],
        ["4", "assert in the UI", "assert on DTOs", "inject tokens -> localStorage"],
        ["5", "screenshot -> quit", "ensure2xx guards all calls", "verify in the REAL UI"],
        ["6", "Extent + Allure", "Extent + Allure", "API clean-up -> reports"],
    ], [16, (BODY_W - 16) / 3, (BODY_W - 16) / 3, (BODY_W - 16) / 3]))
    story.append(Spacer(1, 6))
    story.append(P("Layer colors used everywhere in this guide: "
                   "<font color='#2563EB'><b>UI</b></font> · "
                   "<font color='#15803D'><b>API</b></font> · "
                   "<font color='#C2410C'><b>HYBRID</b></font> · "
                   "<font color='#475569'><b>common</b></font>", "Small"))

    doc.multiBuild(story)
    print("Wrote", OUT)

if __name__ == "__main__":
    build()
