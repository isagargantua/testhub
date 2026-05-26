const { verifyAccessToken } = require("../utils/jwt");

const redis = require("../utils/redis");

async function isTokenRevoked(token) {
  if (!redis) {
    return false;
  }

  try {
    const result = await Promise.race([
      redis.get(`blacklist:${token}`),
      new Promise((resolve) => {
        setTimeout(() => resolve(null), 1000);
      }),
    ]);

    return Boolean(result);
  } catch {
    return false;
  }
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice(7).trim() || null;
}

async function verifyToken(req, res, next) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({
        message: "No token provided",
      });
    }

    if (await isTokenRevoked(token)) {
      return res.status(401).json({
        message: "Token revoked",
      });
    }

    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({
      message: "Invalid token",
    });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    next();
  };
}

module.exports = {
  getBearerToken,
  verifyToken,
  requireRole,
};
