const rateLimit = require("express-rate-limit");

// Default window is 60 s — short enough that a testing-tool user is never
// locked out for long, still meaningful protection against brute-force bursts.
// Override via AUTH_RATE_LIMIT_WINDOW_MS env var if needed.
const authWindowMs = Number(
  process.env.AUTH_RATE_LIMIT_WINDOW_MS || 60 * 1000
);

const authReadMax = Number(
  process.env.AUTH_READ_RATE_LIMIT_MAX || 300
);

const authActionMax = Number(
  process.env.AUTH_ACTION_RATE_LIMIT_MAX || 1000
);

// Traffic arrives via gateway, so req.ip resolves to the gateway's IP and all
// users would share a single rate-limit bucket.  Extract the real client IP
// from the first entry of X-Forwarded-For (set by Render's LB before the
// request reaches the gateway) so each client has its own counter.
function clientIpKey(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff) {
    const first = xff.split(",")[0].trim();
    if (first) return first;
  }
  return req.socket.remoteAddress || req.ip;
}

const createLimiter = (overrides = {}) =>
  rateLimit({
    windowMs: authWindowMs,
    max: authReadMax,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: clientIpKey,
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
