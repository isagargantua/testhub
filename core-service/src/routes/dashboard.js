const express = require("express");

const { PrismaClient } = require("@prisma/client");

const { verifyToken } = require("../middleware/auth");

const prisma = new PrismaClient();

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
      results,
    ] = await Promise.all([
      prisma.project.count(),

      prisma.testCase.count(),

      prisma.testRun.count(),

      prisma.project.count({
        where: {
          status: "ACTIVE",
        },
      }),

      prisma.testRun.count({
        where: {
          status: "IN_PROGRESS",
        },
      }),

      prisma.testRun.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      }),

      prisma.testResult.findMany(),
    ]);

    const breakdown = {
      PASS: 0,
      FAIL: 0,
      SKIP: 0,
      BLOCKED: 0,
    };

    results.forEach((result) => {
      breakdown[result.status]++;
    });

    const executed =
      breakdown.PASS +
      breakdown.FAIL +
      breakdown.SKIP +
      breakdown.BLOCKED;

    const passRatePercent =
      executed === 0
        ? 0
        : Math.round(
            (breakdown.PASS / executed) * 100
          );

    res.json({
      totalProjects,
      activeProjects,
      totalTestCases,
      totalRuns,
      activeRuns,
      passRatePercent,
      recentRuns,
      resultBreakdown: breakdown,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
});

module.exports = router;