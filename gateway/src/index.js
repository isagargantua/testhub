const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const openapiSpec = require("./openapi");

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
  process.env.RENDER_EXTERNAL_URL, // gateway's own URL so /docs Swagger UI can call /api/*
  "http://localhost:5173",
  "http://localhost:3000",
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

// Interactive API docs. Mounted BEFORE the proxy middleware so /docs and
// /openapi.json are served by the gateway itself rather than forwarded to an
// upstream service. Serving these is static work — no DB calls, no effect on
// the proxied API endpoints.
app.get("/openapi.json", (req, res) => {
  res.json(openapiSpec);
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec, {
  customSiteTitle: "testHub API Docs",
}));

const proxyOptions = {
  changeOrigin: true,
  timeout: 120000,
  proxyTimeout: 120000,
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
