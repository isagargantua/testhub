const express = require("express");

const { verifyToken } = require("../middleware/auth");

const prisma = require("../utils/prisma");

const router = express.Router();

router.use(verifyToken);

router.get("/stats", async (req, res) => {
  try {
    const [
      totalProjects,
      totalTestCases,
      totalRuns,
      activeProjects,
      activeRuns,
      recentRuns,
      grouped,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.testCase.count(),
      prisma.testRun.count(),
      prisma.project.count({ where: { status: "ACTIVE" } }),
      prisma.testRun.count({ where: { status: "IN_PROGRESS" } }),
      prisma.testRun.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      // Count results per status in the DB instead of pulling every row into
      // memory — scales with the number of statuses (4), not the row count.
      prisma.testResult.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

    const breakdown = { PASS: 0, FAIL: 0, SKIP: 0, BLOCKED: 0 };

    grouped.forEach((row) => {
      if (breakdown[row.status] !== undefined) {
        breakdown[row.status] = row._count._all;
      }
    });

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

module.exports = router;
