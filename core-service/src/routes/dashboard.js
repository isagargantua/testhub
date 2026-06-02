const express = require("express");

const { verifyToken } = require("../middleware/auth");

const prisma = require("../utils/prisma");

const router = express.Router();

router.use(verifyToken);

router.get("/stats", async (req, res) => {
  try {
    const userId = req.user.id;

    // Every metric is scoped to the current user's own projects (and the
    // suites/cases/runs/results that hang off them), so the dashboard only
    // ever reflects the signed-in user's data.
    const projectWhere = { createdById: userId };
    const caseWhere = { suite: { project: { createdById: userId } } };
    const runWhere = { project: { createdById: userId } };
    const resultWhere = { run: { project: { createdById: userId } } };

    const [
      totalProjects,
      totalTestCases,
      totalRuns,
      activeProjects,
      activeRuns,
      recentRuns,
      allResults,
    ] = await Promise.all([
      prisma.project.count({ where: projectWhere }),
      prisma.testCase.count({ where: caseWhere }),
      prisma.testRun.count({ where: runWhere }),
      prisma.project.count({ where: { ...projectWhere, status: "ACTIVE" } }),
      prisma.testRun.count({ where: { ...runWhere, status: "IN_PROGRESS" } }),
      prisma.testRun.findMany({
        where: runWhere,
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      // Fetch all results ordered newest-first so we can deduplicate to one
      // result per unique test case (its latest run result).
      prisma.testResult.findMany({
        where: resultWhere,
        orderBy: { executedAt: "desc" },
        select: { testCaseId: true, status: true },
      }),
    ]);

    // Keep only the latest result per test case, then count by status.
    // This means a TC that appears in 3 runs counts once (its most recent result),
    // so the breakdown total matches the number of unique executed test cases.
    const breakdown = { PASS: 0, FAIL: 0, SKIP: 0, BLOCKED: 0 };
    const seenTCIds = new Set();
    for (const r of allResults) {
      if (!seenTCIds.has(r.testCaseId)) {
        seenTCIds.add(r.testCaseId);
        if (r.status in breakdown) breakdown[r.status]++;
      }
    }

    const executed =
      breakdown.PASS + breakdown.FAIL + breakdown.SKIP + breakdown.BLOCKED;

    const passRatePercent =
      executed === 0
        ? 0
        : Math.round((breakdown.PASS / executed) * 100);

    // Fetch the most recent run's results with testcase titles so the
    // dashboard can show a per-testcase breakdown for the latest run.
    const latestRunId = recentRuns.length > 0 ? recentRuns[0].id : null;

    const latestRunResults = latestRunId
      ? await prisma.testResult.findMany({
          where: { runId: latestRunId },
          include: {
            testCase: {
              select: { title: true, priority: true },
            },
          },
          orderBy: { executedAt: "desc" },
          take: 20,
        })
      : [];

    res.json({
      totalProjects,
      activeProjects,
      totalTestCases,
      totalRuns,
      activeRuns,
      passRatePercent,
      recentRuns,
      resultBreakdown: breakdown,
      latestRunName: recentRuns[0]?.name ?? null,
      latestRunStatus: recentRuns[0]?.status ?? null,
      latestRunResults,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
});

// Which test cases are marked a given status, across ALL runs — backs the
// clickable Result Breakdown on the dashboard (the breakdown is global, so this
// is global too, matching the chart counts).
router.get("/results", async (req, res) => {
  try {
    const status = String(req.query.status || "").toUpperCase();
    const valid = ["PASS", "FAIL", "SKIP", "BLOCKED"];
    if (!valid.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const results = await prisma.testResult.findMany({
      where: {
        status,
        // Scope to the current user's runs only.
        run: { project: { createdById: req.user.id } },
      },
      orderBy: { executedAt: "desc" },
      take: 200,
      include: {
        testCase: { select: { title: true, priority: true } },
        run: { select: { name: true } },
      },
    });

    res.json(
      results.map((r) => ({
        id: r.id,
        status: r.status,
        comment: r.comment,
        executedAt: r.executedAt,
        testCaseTitle: r.testCase?.title ?? "(deleted test case)",
        priority: r.testCase?.priority ?? null,
        runName: r.run?.name ?? "(deleted run)",
      }))
    );
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
});

module.exports = router;
