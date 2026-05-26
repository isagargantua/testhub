const express = require("express");

const { body, validationResult } = require("express-validator");

const { PrismaClient } = require("@prisma/client");

const { verifyToken, requireRole } = require("../middleware/auth");

const prisma = new PrismaClient();

const router = express.Router();

router.use(verifyToken);

router.get("/project/:projectId", async (req, res) => {
  try {
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

      const run = await prisma.testRun.create({
        data: {
          name: req.body.name,
          description: req.body.description,
          projectId: req.params.projectId,
          createdById: req.user.id,
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
    const run = await prisma.testRun.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!run) {
      return res.status(404).json({
        message: "Run not found",
      });
    }

    const suites = await prisma.testSuite.findMany({
      where: {
        projectId: run.projectId,
      },
    });

    const suiteIds = suites.map((suite) => suite.id);

    const testCases = await prisma.testCase.findMany({
      where: {
        suiteId: {
          in: suiteIds,
        },
      },
    });

    const existingResults = await prisma.testResult.findMany({
      where: {
        runId: run.id,
      },
      include: {
        testCase: true,
      },
    });

    const results = testCases.map((testCase) => {
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

    existingResults.forEach((result) => {
      summary[result.status]++;
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
    const run = await prisma.testRun.update({
      where: {
        id: req.params.id,
      },
      data: {
        name: req.body.name,
        description: req.body.description,
        status: req.body.status,
      },
    });

    res.json(run);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
});

router.delete("/:id", requireRole("ADMIN", "TESTER"), async (req, res) => {
  try {
    await prisma.testRun.delete({
      where: {
        id: req.params.id,
      },
    });

    res.json({
      message: "Run deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
});

module.exports = router;
