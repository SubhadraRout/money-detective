import express from "express";
import cors from "cors";

const app = express();

const PORT = Number(
  process.env.PORT ?? 4000
);

app.use(
  cors()
);

app.use(
  express.json()
);

app.get(
  "/health",
  (_req, res) => {
    res.json({
      ok: true,
      service: "money-detective-api",
      version: "1.0.0"
    });
  }
);

app.get(
  "/",
  (_req, res) => {
    res.json({
      name: "Money Detective API",
      tagline:
        "Find, explain, and recover money merchants are losing.",
      status: "running"
    });
  }
);

app.listen(
  PORT,
  () => {
    console.log(
      `Money Detective API running on http://localhost:${PORT}`
    );
  }
);