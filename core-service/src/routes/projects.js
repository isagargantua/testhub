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

router.get("/", async (req, res) => {
  try {
    const page = Number(req.query.page || 1);

    const limit = Number(req.query.limit || 10);

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.project.findMany({
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.project.count(),
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
  "/",
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

      const project = await prisma.project.create({
        data: {
          name: req.body.name,
          description: req.body.description,
          createdById: req.user.id,
        },
      });

      res.status(201).json(project);
    } catch (error) {
      console.log(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  }
);

router.get("/:id", async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
});

router.put(
  "/:id",
  requireRole("ADMIN", "TESTER"),
  async (req, res) => {
    try {
      const project = await prisma.project.update({
        where: {
          id: req.params.id,
        },
        data: {
          name: req.body.name,
          description: req.body.description,
          status: req.body.status,
        },
      });

      res.json(project);
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
      await prisma.project.delete({
        where: {
          id: req.params.id,
        },
      });

      res.json({
        message: "Project deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        message: "Internal server error",
      });
    }
  }
);

module.exports = router;