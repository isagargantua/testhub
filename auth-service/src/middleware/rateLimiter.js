const rateLimit = require("express-rate-limit");

const createLimiter = (overrides = {}) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message: "Too many requests, please try again later.",
    },
    ...overrides,
  });

const authLimiter = createLimiter();

const authActionLimiter = createLimiter({
  max: 200,
  skipSuccessfulRequests: true,
});

module.exports = {
  authLimiter,
  authActionLimiter,
};
