const express = require("express");

const { body, validationResult } = require("express-validator");

const { PrismaClient } = require("@prisma/client");

const {
  verifyToken,
  requireRole,
} = require("../middleware/auth");

const prisma = new PrismaClient();

const router = express.Router();

router.use(verifyToken);

router.get("/project/:projectId", async (req, res) => {
  try {
    const suites = await prisma.testSuite.findMany({
      where: {
        projectId: req.params.projectId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(suites);
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
});

router.post(
  "/project/:projectId",
  requireRole("ADMIN", "TESTER"),
  [
    body("name").notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          errors: errors.array(),
        });
      }

      const suite = await prisma.testSuite.create({
        data: {
          name: req.body.name,
          description: req.body.description,
          projectId: req.params.projectId,
        },
      });

      res.status(201).json(suite);
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
      const suite = await prisma.testSuite.update({
        where: {
          id: req.params.id,
        },
        data: {
          name: req.body.name,
          description: req.body.description,
        },
      });

      res.json(suite);
    } catch (error) {
      res.status(500).json({
        message: "Internal server error",
      });
    }
  }
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      await prisma.testSuite.delete({
        where: {
          id: req.params.id,
        },
      });

      res.json({
        message: "Suite deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        message: "Internal server error",
      });
    }
  }
);

module.exports = router;