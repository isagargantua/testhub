const express = require("express");

const { body, validationResult } = require("express-validator");

const {
  verifyToken,
  requireRole,
} = require("../middleware/auth");

const prisma = require("../utils/prisma");
const { isNotFoundError } = require("../utils/http");
const { ownedProject, ownedSuite } = require("../utils/ownership");

const router = express.Router();

router.use(verifyToken);

router.get("/project/:projectId", async (req, res) => {
  try {
    // Only list suites of a project the user owns.
    if (!(await ownedProject(req.params.projectId, req.user.id))) {
      return res.status(404).json({ message: "Project not found" });
    }

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

      // Can only add suites to a project the user owns.
      if (!(await ownedProject(req.params.projectId, req.user.id))) {
        return res.status(404).json({ message: "Project not found" });
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
      if (!(await ownedSuite(req.params.id, req.user.id))) {
        return res.status(404).json({ message: "Suite not found" });
      }

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
      if (isNotFoundError(error)) {
        return res.status(404).json({ message: "Suite not found" });
      }

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
      if (!(await ownedSuite(req.params.id, req.user.id))) {
        return res.status(404).json({ message: "Suite not found" });
      }

      await prisma.testSuite.delete({
        where: {
          id: req.params.id,
        },
      });

      res.json({
        message: "Suite deleted successfully",
      });
    } catch (error) {
      if (isNotFoundError(error)) {
        return res.status(404).json({ message: "Suite not found" });
      }

      res.status(500).json({
        message: "Internal server error",
      });
    }
  }
);

module.exports = router;
