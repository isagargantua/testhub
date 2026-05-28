const express = require("express");

const { body, validationResult } = require("express-validator");

const {
  verifyToken,
  requireRole,
} = require("../middleware/auth");

const prisma = require("../utils/prisma");
const { parsePagination, isNotFoundError } = require("../utils/http");

const router = express.Router();

router.use(verifyToken);

router.get("/suite/:suiteId", async (req, res) => {
  try {
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
