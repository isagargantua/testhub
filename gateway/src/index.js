const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require("morgan");
const { createProxyMiddleware } = require("http-proxy-middleware");

dotenv.config();

const app = express();

const requiredEnv = ["AUTH_SERVICE_URL", "CORE_SERVICE_URL"];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`${key} is required`);
  }
}

function normalizeTarget(value) {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `http://${value}`;
}

const authServiceTarget = normalizeTarget(process.env.AUTH_SERVICE_URL);
const coreServiceTarget = normalizeTarget(process.env.CORE_SERVICE_URL);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
  "http://localhost:5173",
]
  .filter(Boolean)
  .flatMap((origin) => origin.split(","))
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked origin: ${origin}`));
    },
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const proxyOptions = {
  changeOrigin: true,
  timeout: 30000,
  proxyTimeout: 30000,
  xfwd: true,
  pathRewrite(path, req) {
    return req.originalUrl;
  },
};

app.use(
  "/api/auth",
  createProxyMiddleware({
    ...proxyOptions,
    target: authServiceTarget,
  })
);

app.use(
  [
    "/api/projects",
    "/api/suites",
    "/api/testcases",
    "/api/runs",
    "/api/dashboard",
  ],
  createProxyMiddleware({
    ...proxyOptions,
    target: coreServiceTarget,
  })
);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Gateway running on port ${PORT}`);
});
