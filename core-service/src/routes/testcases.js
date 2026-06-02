const express = require("express");

const { body, validationResult } = require("express-validator");

const {
  verifyToken,
  requireRole,
} = require("../middleware/auth");

const prisma = require("../utils/prisma");
const { parsePagination, isNotFoundError } = require("../utils/http");
const { ownedSuite, ownedTestCase } = require("../utils/ownership");

const router = express.Router();

router.use(verifyToken);

// Global view — all test cases the user owns, enriched with project/suite/run context.
// Uses a two-step approach (projects → suiteIds → testcases) to keep Prisma
// queries flat and avoid nested-relation filter edge-cases on Render Postgres.
router.get("/all", async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const search    = req.query.search?.trim()    || "";
    const projectId = req.query.projectId?.trim() || "";

    // Step 1 — resolve owned project IDs
    const projects = await prisma.project.findMany({
      where: { createdById: req.user.id },
      select: { id: true, name: true },
    });

    const projectIds = projects.map((p) => p.id);
    if (projectIds.length === 0) {
      return res.json({ items: [], pagination: { page, limit, total: 0, pages: 0 } });
    }

    const scopedProjectIds = projectId ? [projectId] : projectIds;

    // Step 2 — resolve suites within those projects
    const suites = await prisma.testSuite.findMany({
      where: { projectId: { in: scopedProjectIds } },
      select: {
        id: true,
        name: true,
        project: { select: { id: true, name: true } },
      },
    });

    const suiteIds = suites.map((s) => s.id);
    if (suiteIds.length === 0) {
      return res.json({ items: [], pagination: { page, limit, total: 0, pages: 0 } });
    }

    const suiteMap = Object.fromEntries(suites.map((s) => [s.id, s]));

    // Step 3 — query test cases by flat suiteId list
    const where = {
      suiteId: { in: suiteIds },
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
    };

    const [raw, total] = await Promise.all([
      prisma.testCase.findMany({
        where,
        select: {
          id: true, title: true, description: true,
          priority: true, tags: true, createdAt: true,
          suiteId: true,
          results: {
            select: {
              runId: true, status: true, executedAt: true,
              run: { select: { id: true, name: true, status: true } },
            },
            orderBy: { executedAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.testCase.count({ where }),
    ]);

    const items = raw.map((tc) => {
      const suite = suiteMap[tc.suiteId];
      return {
        id:          tc.id,
        title:       tc.title,
        description: tc.description,
        priority:    tc.priority,
        tags:        tc.tags,
        createdAt:   tc.createdAt,
        project:     suite.project,
        suite:       { id: suite.id, name: suite.name },
        runs: tc.results.map((r) => ({
          runId:        r.runId,
          runName:      r.run.name,
          runStatus:    r.run.status,
          resultStatus: r.status,
          executedAt:   r.executedAt,
        })),
        latestResult: tc.results[0]
          ? { status: tc.results[0].status, runName: tc.results[0].run.name }
          : null,
      };
    });

    res.json({ items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/suite/:suiteId", async (req, res) => {
  try {
    // Only list cases from a suite the user owns.
    if (!(await ownedSuite(req.params.suiteId, req.user.id))) {
      return res.status(404).json({ message: "Suite not found" });
    }

    const { page, limit, skip } = parsePagination(req.query);

    const where = {
      suiteId: req.params.suiteId,
    };

    const [items, total] = await Promise.all([
      prisma.testCase.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.testCase.count({
        where,
      }),
    ]);

    res.json({
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
});

router.post(
  "/suite/:suiteId",
  requireRole("ADMIN", "TESTER"),
  [
    body("title").notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          errors: errors.array(),
        });
      }

      // Can only add cases to a suite the user owns.
      if (!(await ownedSuite(req.params.suiteId, req.user.id))) {
        return res.status(404).json({ message: "Suite not found" });
      }

      const testCase = await prisma.testCase.create({
        data: {
          title: req.body.title,
          description: req.body.description,
          steps: req.body.steps,
          expected: req.body.expected,
          priority: req.body.priority || "MEDIUM",
          tags: req.body.tags || [],
          suiteId: req.params.suiteId,
          createdById: req.user.id,
        },
      });

      res.status(201).json(testCase);
    } catch (error) {
      console.log(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  }
);

router.put(
  "/:id",
  requireRole("ADMIN", "TESTER"),
  async (req, res) => {
    try {
      if (!(await ownedTestCase(req.params.id, req.user.id))) {
        return res.status(404).json({ message: "Test case not found" });
      }

      const testCase = await prisma.testCase.update({
        where: {
          id: req.params.id,
        },
        data: {
          title: req.body.title,
          description: req.body.description,
          steps: req.body.steps,
          expected: req.body.expected,
          priority: req.body.priority,
          status: req.body.status,
          tags: req.body.tags,
        },
      });

      res.json(testCase);
    } catch (error) {
      if (isNotFoundError(error)) {
        return res.status(404).json({ message: "Test case not found" });
      }

      console.log(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  }
);

router.delete(
  "/:id",
  requireRole("ADMIN", "TESTER"),
  async (req, res) => {
    try {
      if (!(await ownedTestCase(req.params.id, req.user.id))) {
        return res.status(404).json({ message: "Test case not found" });
      }

      await prisma.testCase.delete({
        where: {
          id: req.params.id,
        },
      });

      res.json({
        message: "Test case deleted successfully",
      });
    } catch (error) {
      if (isNotFoundError(error)) {
        return res.status(404).json({ message: "Test case not found" });
      }

      res.status(500).json({
        message: "Internal server error",
      });
    }
  }
);

module.exports = router;
