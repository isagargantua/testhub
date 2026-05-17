const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require("morgan");
const proxy = require("express-http-proxy");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", proxy(process.env.AUTH_SERVICE_URL, {
  proxyReqPathResolver: (req) => {
    return req.originalUrl;
  },
  proxyTimeout: 10000,
}));

app.use("/api/projects", proxy(process.env.CORE_SERVICE_URL, {
  proxyReqPathResolver: (req) => {
    return req.originalUrl;
  },
  proxyTimeout: 10000,
}));

app.use("/api/suites", proxy(process.env.CORE_SERVICE_URL, {
  proxyReqPathResolver: (req) => {
    return req.originalUrl;
  },
  proxyTimeout: 10000,
}));

app.use("/api/testcases", proxy(process.env.CORE_SERVICE_URL, {
  proxyReqPathResolver: (req) => {
    return req.originalUrl;
  },
  proxyTimeout: 10000,
}));

app.use("/api/runs", proxy(process.env.CORE_SERVICE_URL, {
  proxyReqPathResolver: (req) => {
    return req.originalUrl;
  },
  proxyTimeout: 10000,
}));

app.use("/api/dashboard", proxy(process.env.CORE_SERVICE_URL, {
  proxyReqPathResolver: (req) => {
    return req.originalUrl;
  },
  proxyTimeout: 10000,
}));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Gateway running on port ${PORT}`);
});