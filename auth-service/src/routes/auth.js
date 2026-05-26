const express = require("express");
const bcrypt = require("bcryptjs");

const { body, validationResult } = require("express-validator");

const jwt = require("jsonwebtoken");

const { PrismaClient } = require("@prisma/client");

const {
  authLimiter,
  authActionLimiter,
} = require("../middleware/rateLimiter");
const {
  verifyToken,
  requireRole,
  getBearerToken,
} = require("../middleware/auth");

const redis = require("../utils/redis");

const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../utils/jwt");

const prisma = new PrismaClient();

const router = express.Router();

router.post(
  "/register",
  authActionLimiter,
  [
    body("name").trim().notEmpty(),
    body("email").trim().isEmail().normalizeEmail(),
    body("password").isLength({ min: 6 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          errors: errors.array(),
        });
      }

      const name = req.body.name.trim();
      const email = req.body.email.trim().toLowerCase();
      const { password } = req.body;

      const existingUser = await prisma.user.findUnique({
        where: {
          email,
        },
      });

      if (existingUser) {
        return res.status(400).json({
          message: "User already exists",
        });
      }

      const userCount = await prisma.user.count();

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: userCount === 0 ? "ADMIN" : "TESTER",
        },
      });

      const accessToken = generateAccessToken(user);

      const refreshToken = generateRefreshToken(user);

      res.status(201).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      console.log(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },
);

router.post(
  "/login",
  authActionLimiter,
  [
    body("email").trim().isEmail().normalizeEmail(),
    body("password").notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          errors: errors.array(),
        });
      }

      const email = req.body.email.trim().toLowerCase();
      const { password } = req.body;

      const user = await prisma.user.findUnique({
        where: {
          email,
        },
      });

      if (!user) {
        return res.status(401).json({
          message: "Invalid credentials",
        });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);

      if (!isMatch) {
        return res.status(401).json({
          message: "Invalid credentials",
        });
      }

      const accessToken = generateAccessToken(user);

      const refreshToken = generateRefreshToken(user);

      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      console.log(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },
);

router.get("/me", authLimiter, async (req, res) => {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({
        message: "No token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.id,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    res.status(401).json({
      message: "Invalid token",
    });
  }
});

router.post("/refresh", authActionLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        message: "Refresh token required",
      });
    }

    const decoded = verifyRefreshToken(refreshToken);

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.id,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const accessToken = generateAccessToken(user);

    res.json({
      accessToken,
    });
  } catch (error) {
    res.status(401).json({
      message: "Invalid refresh token",
    });
  }
});

router.post("/logout", authActionLimiter, async (req, res) => {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({
        message: "No token provided",
      });
    }

    try {
      const decoded = jwt.decode(token);

      if (redis && decoded?.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);

        if (ttl > 0) {
          Promise.race([
            redis.set(`blacklist:${token}`, "true", "EX", ttl),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Redis timeout")), 1000),
            ),
          ]).catch(() => {
            console.log("Redis blacklist skipped");
          });
        }
      }
    } catch (err) {
      console.log("Redis unavailable");
    }

    res.json({
      message: "Logged out successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
});

router.get(
  "/users",
  authLimiter,
  verifyToken,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const page = Math.max(Number(req.query.page || 1), 1);
      const limit = Math.min(
        Math.max(Number(req.query.limit || 10), 1),
        100
      );
      const search = String(req.query.search || "").trim();
      const skip = (page - 1) * limit;

      const where = search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                email: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {};

      const [items, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.user.count({ where }),
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
  }
);

router.patch(
  "/users/:id/reset-password",
  authActionLimiter,
  verifyToken,
  requireRole("ADMIN"),
  [body("password").isLength({ min: 6 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          errors: errors.array(),
        });
      }

      const user = await prisma.user.findUnique({
        where: {
          id: req.params.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      const passwordHash = await bcrypt.hash(req.body.password, 10);

      await prisma.user.update({
        where: {
          id: req.params.id,
        },
        data: {
          passwordHash,
        },
      });

      res.json({
        message: "Password reset successfully",
        user,
      });
    } catch (error) {
      console.log(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  }
);

router.delete(
  "/users/:id",
  authActionLimiter,
  verifyToken,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: {
          id: req.params.id,
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      if (user.id === req.user.id) {
        return res.status(400).json({
          message: "You cannot delete your own account from this page",
        });
      }

      if (user.role === "ADMIN") {
        const adminCount = await prisma.user.count({
          where: {
            role: "ADMIN",
          },
        });

        if (adminCount <= 1) {
          return res.status(400).json({
            message: "At least one admin account must remain",
          });
        }
      }

      await prisma.user.delete({
        where: {
          id: req.params.id,
        },
      });

      res.json({
        message: "User deleted successfully",
      });
    } catch (error) {
      console.log(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  }
);

module.exports = router;
