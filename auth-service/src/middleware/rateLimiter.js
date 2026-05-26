const rateLimit = require("express-rate-limit");

const authWindowMs = Number(
  process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000
);

const authReadMax = Number(
  process.env.AUTH_READ_RATE_LIMIT_MAX || 300
);

const authActionMax = Number(
  process.env.AUTH_ACTION_RATE_LIMIT_MAX || 1000
);

const createLimiter = (overrides = {}) =>
  rateLimit({
    windowMs: authWindowMs,
    max: authReadMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message: "Too many requests, please try again later.",
    },
    ...overrides,
  });

const authLimiter = createLimiter();

const authActionLimiter = createLimiter({
  max: authActionMax,
  skipSuccessfulRequests: true,
});

module.exports = {
  authLimiter,
  authActionLimiter,
};
