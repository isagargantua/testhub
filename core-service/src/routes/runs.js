const express = require("express");

const { body, validationResult } = require("express-validator");

const { verifyToken, requireRole } = require("../middleware/auth");

const prisma = require("../utils/prisma");
const { isNotFoundError } = require("../utils/http");
const { ownedProject, ownedRun } = require("../utils/ownership");

const router = express.Router();

router.use(verifyToken);

router.get("/project/:projectId", async (req, res) => {
  try {
    // Only list runs of a project the user owns.
    if (!(await ownedProject(req.params.projectId, req.user.id))) {
      return res.status(404).json({ message: "Project not found" });
    }

    const runs = await prisma.testRun.findMany({
      where: {
        projectId: req.params.projectId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(runs);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
});

router.post(
  "/project/:projectId",
  requireRole("ADMIN", "TESTER"),
  [body("name").notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          errors: errors.array(),
        });
      }

      // Can only create runs in a project the user owns.
      if (!(await ownedProject(req.params.projectId, req.user.id))) {
        return res.status(404).json({ message: "Project not found" });
      }

      const run = await prisma.testRun.create({
        data: {
          name: req.body.name,
          description: req.body.description,
          projectId: req.params.projectId,
          createdById: req.user.id,
          selectedCaseIds: req.body.testCaseIds || [],
        },
      });

      res.status(201).json(run);
    } catch (error) {
      console.log(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },
);

router.get("/:id", async (req, res) => {
  try {
    const owned = await ownedRun(req.params.id, req.user.id);

    if (!owned) {
      return res.status(404).json({
        message: "Run not found",
      });
    }

    // Drop the joined project (used only for the ownership check) so the
    // response shape stays exactly as before.
    const { project, ...run } = owned;

    const suites = await prisma.testSuite.findMany({
      where: {
        projectId: run.projectId,
      },
    });

    const suiteIds = suites.map((suite) => suite.id);

    const allTestCases = await prisma.testCase.findMany({
      where: {
        suiteId: {
          in: suiteIds,
        },
      },
    });

    const filteredCases = run.selectedCaseIds?.length > 0
      ? allTestCases.filter((tc) => run.selectedCaseIds.includes(tc.id))
      : allTestCases;

    const existingResults = await prisma.testResult.findMany({
      where: {
        runId: run.id,
      },
      include: {
        testCase: true,
      },
    });

    const results = filteredCases.map((testCase) => {
      const existing = existingResults.find(
        (r) => r.testCaseId === testCase.id,
      );

      if (existing) {
        return existing;
      }

      return {
        id: `temp-${testCase.id}`,
        status: "PENDING",
        testCaseId: testCase.id,
        testCase,
      };
    });

    const summary = {
      PASS: 0,
      FAIL: 0,
      SKIP: 0,
      BLOCKED: 0,
    };

    const filteredCaseIds = new Set(filteredCases.map((tc) => tc.id));
    existingResults.forEach((result) => {
      if (filteredCaseIds.has(result.testCaseId)) {
        summary[result.status]++;
      }
    });

    res.json({
      ...run,
      results,
      summary,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
});

router.post(
  "/:id/results",
  requireRole("ADMIN", "TESTER"),
  [
    body("testCaseId").notEmpty(),
    body("status").isIn(["PASS", "FAIL", "SKIP", "BLOCKED"]),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          errors: errors.array(),
        });
      }

      // Can only submit results to a run the user owns.
      if (!(await ownedRun(req.params.id, req.user.id))) {
        return res.status(404).json({ message: "Run not found" });
      }

      const result = await prisma.testResult.upsert({
        where: {
          runId_testCaseId: {
            runId: req.params.id,
            testCaseId: req.body.testCaseId,
          },
        },
        update: {
          status: req.body.status,
          comment: req.body.comment,
        },
        create: {
          runId: req.params.id,
          testCaseId: req.body.testCaseId,
          status: req.body.status,
          comment: req.body.comment,
        },
      });

      res.json(result);
    } catch (error) {
      console.log(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },
);

router.put("/:id", requireRole("ADMIN", "TESTER"), async (req, res) => {
  try {
    if (!(await ownedRun(req.params.id, req.user.id))) {
      return res.status(404).json({ message: "Run not found" });
    }

    const run = await prisma.testRun.update({
      where: {
        id: req.params.id,
      },
      data: {
        name: req.body.name,
        description: req.body.description,
        status: req.body.status,
        ...(req.body.selectedCaseIds !== undefined && {
          selectedCaseIds: req.body.selectedCaseIds,
        }),
      },
    });

    res.json(run);
  } catch (error) {
    if (isNotFoundError(error)) {
      return res.status(404).json({ message: "Run not found" });
    }

    console.log(error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
});

router.delete("/:id", requireRole("ADMIN", "TESTER"), async (req, res) => {
  try {
    if (!(await ownedRun(req.params.id, req.user.id))) {
      return res.status(404).json({ message: "Run not found" });
    }

    await prisma.testRun.delete({
      where: {
        id: req.params.id,
      },
    });

    res.json({
      message: "Run deleted successfully",
    });
  } catch (error) {
    if (isNotFoundError(error)) {
      return res.status(404).json({ message: "Run not found" });
    }

    res.status(500).json({
      message: "Internal server error",
    });
  }
});

// Export a run's full results as a downloadable report. `?format=csv` (default)
// returns a CSV attachment; `?format=json` returns a structured JSON attachment.
// Great for practicing file-download assertions in UI/API automation.
function csvEscape(value) {
  const str = value === null || value === undefined ? "" : String(value);

  // Quote and double-up internal quotes if the value contains a comma, quote,
  // or newline — standard RFC 4180 CSV escaping.
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

router.get("/:id/export", async (req, res) => {
  try {
    const run = await ownedRun(req.params.id, req.user.id);

    if (!run) {
      return res.status(404).json({ message: "Run not found" });
    }

    // Resolve the test cases in scope for this run (the selected subset, or all
    // cases in the project's suites if none were explicitly selected), then
    // join each against its recorded result.
    const suites = await prisma.testSuite.findMany({
      where: { projectId: run.projectId },
      select: { id: true },
    });

    const allTestCases = await prisma.testCase.findMany({
      where: { suiteId: { in: suites.map((s) => s.id) } },
    });

    const inScope =
      run.selectedCaseIds?.length > 0
        ? allTestCases.filter((tc) => run.selectedCaseIds.includes(tc.id))
        : allTestCases;

    const existingResults = await prisma.testResult.findMany({
      where: { runId: run.id },
    });

    const resultByCaseId = new Map(
      existingResults.map((r) => [r.testCaseId, r]),
    );

    const rows = inScope.map((tc) => {
      const result = resultByCaseId.get(tc.id);

      return {
        testCaseId: tc.id,
        title: tc.title,
        priority: tc.priority,
        status: result ? result.status : "PENDING",
        comment: result?.comment ?? "",
        executedAt: result?.executedAt ?? null,
      };
    });

    const format = String(req.query.format || "csv").toLowerCase();
    const safeName = (run.name || "run").replace(/[^a-z0-9-_]+/gi, "_");

    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${safeName}_${run.id}.json"`,
      );

      return res.send(
        JSON.stringify(
          {
            run: {
              id: run.id,
              name: run.name,
              status: run.status,
              projectId: run.projectId,
              createdAt: run.createdAt,
            },
            totalCases: rows.length,
            results: rows,
          },
          null,
          2,
        ),
      );
    }

    const header = [
      "Test Case ID",
      "Title",
      "Priority",
      "Status",
      "Comment",
      "Executed At",
    ];

    const lines = [header.join(",")];

    for (const row of rows) {
      lines.push(
        [
          csvEscape(row.testCaseId),
          csvEscape(row.title),
          csvEscape(row.priority),
          csvEscape(row.status),
          csvEscape(row.comment),
          csvEscape(row.executedAt ? row.executedAt.toISOString() : ""),
        ].join(","),
      );
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}_${run.id}.csv"`,
    );

    return res.send(lines.join("\r\n"));
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
});

module.exports = router;
