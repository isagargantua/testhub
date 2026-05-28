const rateLimit = require("express-rate-limit");

// ---------------------------------------------------------------------------
// Rate limiting is OPT-IN and OFF BY DEFAULT.
//
// Why: testHub is a single-user QA practice target. One person plus their
// automated Postman/RestAssured suites hammer /login, /me and /refresh
// constantly. Traffic arrives via a 3-hop proxy chain (Render LB → gateway →
// auth-service). Across that chain, IP-based keying repeatedly collapsed every
// client into ONE shared bucket and locked everyone out — even with correct
// credentials, on fresh devices and networks. Rate limiting here provides
// effectively zero security benefit and was the sole source of "Too many login
// attempts" lockouts.
//
// So: unless you EXPLICITLY set ENABLE_AUTH_RATE_LIMIT=true, every limiter is a
// no-op pass-through. This makes the lockout bug structurally impossible.
//
// No other env var can shrink the limits or change the window — the previous
// AUTH_RATE_LIMIT_WINDOW_MS / AUTH_*_RATE_LIMIT_MAX overrides are gone, because
// a stale tiny value in the Render dashboard silently overrode every code fix.
//
// If you ever want to PRACTICE testing rate limits, set ENABLE_AUTH_RATE_LIMIT
// =true in the auth-service env and you'll get the generous limits below.
// ---------------------------------------------------------------------------

const RATE_LIMIT_ENABLED = process.env.ENABLE_AUTH_RATE_LIMIT === "true";

// No-op middleware used when rate limiting is disabled (the default).
const passthrough = (req, res, next) => next();

// Traffic arrives via the gateway, so req.ip would resolve to the gateway's IP
// and all users would share a single bucket. Extract the real client IP from
// the first entry of X-Forwarded-For (set by Render's LB) so each client gets
// its own counter. Only used when rate limiting is explicitly enabled.
function clientIpKey(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff) {
    const first = xff.split(",")[0].trim();
    if (first) return first;
  }
  return req.socket.remoteAddress || req.ip;
}

// Generous, hardcoded limits — used ONLY when ENABLE_AUTH_RATE_LIMIT=true.
// A 15-minute window with these caps is high enough that a human + automation
// never hits it, but still demonstrates rate limiting for practice scenarios.
const WINDOW_MS = 15 * 60 * 1000;

const createLimiter = (overrides = {}) =>
  rateLimit({
    windowMs: WINDOW_MS,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: clientIpKey,
    message: {
      message: "Too many requests, please try again later.",
    },
    ...overrides,
  });

// Read endpoints (e.g. /me): very high cap.
const authLimiter = RATE_LIMIT_ENABLED
  ? createLimiter({ max: 2000 })
  : passthrough;

// Action endpoints (login/register/refresh/logout): only FAILED requests count
// (skipSuccessfulRequests), so a correct login never consumes quota.
const authActionLimiter = RATE_LIMIT_ENABLED
  ? createLimiter({ max: 500, skipSuccessfulRequests: true })
  : passthrough;

if (RATE_LIMIT_ENABLED) {
  console.log(
    `[rateLimiter] ENABLED (window ${WINDOW_MS}ms). Unset ENABLE_AUTH_RATE_LIMIT (or set it to anything other than "true") to disable.`
  );
} else {
  console.log(
    "[rateLimiter] DISABLED (default). No auth endpoints are rate limited."
  );
}

module.exports = {
  authLimiter,
  authActionLimiter,
};
