require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const authRoutes = require("./routes/auth");

const app = express();

app.set("trust proxy", 1);

app.use(cors());

app.use(express.json());

app.use(morgan(process.env.NODE_ENV === "production" ? "tiny" : "dev"));

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
  });
});

app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
});
