const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require("morgan");

const projectsRoutes = require("./routes/projects");
const suitesRoutes = require("./routes/suites");
const testcasesRoutes = require("./routes/testcases");
const runsRoutes = require("./routes/runs");
const dashboardRoutes = require("./routes/dashboard");
const dumpsRoutes = require("./routes/dumps");

dotenv.config();

const app = express();

app.use(cors());

app.use(express.json());

app.use(morgan(process.env.NODE_ENV === "production" ? "tiny" : "dev"));

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
  });
});

app.use("/api/projects", projectsRoutes);
app.use("/api/suites", suitesRoutes);
app.use("/api/testcases", testcasesRoutes);
app.use("/api/runs", runsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/dumps", dumpsRoutes);

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`Core service running on port ${PORT}`);
});