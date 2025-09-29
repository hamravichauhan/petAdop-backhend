// src/app.js
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import path from "node:path";
import { fileURLToPath } from "node:url";

import routes from "./routes/index.js"; // mounts sub-routers (e.g., /pets, /auth, etc.)
// Optional: add chat HTTP routes if you create them
// import chatRoutes from "./routes/chat.routes.js";

const app = express();

/* ---------------- Security / hardening ---------------- */
app.set("trust proxy", true);
app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

/* ---------------- CORS (credentials-safe) ------------- */
const devDefaults = ["http://localhost:5173", "http://127.0.0.1:5173"];
const envList = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const allowList = envList.length ? envList : devDefaults;

const corsOptions = {
  origin(origin, cb) {
    // Allow tools/curl/no-origin and allowed frontends
    if (!origin || allowList.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS: Origin ${origin} not allowed`), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Content-Type", "Authorization"],
};

// ❌ Express 5: don’t use app.options("*", ...)
// app.options("*", cors(corsOptions));
app.use(cors(corsOptions));

/* ---------------- Body & cookies ---------------------- */
// Helpful JSON parse error surface
app.use(express.json({ limit: "16kb", strict: true }));
app.use((err, _req, res, next) => {
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Invalid JSON body" });
  }
  next(err);
});

app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());

/* ---------------- Logs & perf ------------------------- */
app.use(morgan("dev"));
app.use(compression());

/* ---------------- Static uploads ---------------------- */
const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsAbs = path.join(__dirname, "..", UPLOAD_DIR);
app.use("/uploads", express.static(uploadsAbs));

/* ---------------- Health ------------------------------ */
app.get("/health", (_req, res) =>
  res.json({ status: "ok", uptime: process.uptime() })
);

// Small internal ping for quick checks
app.get("/api/_ping", (_req, res) => res.json({ ok: true, where: "app-api" }));

/* ---------------- API routes -------------------------- */
app.use("/api", routes);

// If/when you add REST for chat history:
// app.use("/chat", chatRoutes);

/* ---------------- 404 --------------------------------- */
app.use((req, res) =>
  res.status(404).json({ success: false, message: "Route not found" })
);

/* -------- Optional: readable CORS errors -------------- */
app.use((err, _req, res, next) => {
  if (err?.message?.startsWith("CORS:")) {
    return res.status(403).json({ success: false, message: err.message });
  }
  return next(err);
});

/* --------------- Global error handler ----------------- */
// Works with your httpError helper: next(httpError(status, msg))
app.use((err, _req, res, _next) => {
  const status =
    err?.status ||
    err?.statusCode ||
    (err?.name === "ValidationError" ? 400 : 500);

  const payload = {
    success: false,
    message: err?.message || "Internal Server Error",
  };

  // Include details in non-production for easier debugging
  if (process.env.NODE_ENV !== "production") {
    payload.stack = err?.stack;
    // Surface express-validator errors if present
    if (err?.errors) payload.errors = err.errors;
  }

  res.status(status).json(payload);
});

/* ------- Export CORS origins for Socket.IO ------------- */
// Reuse this in server.js so WS and HTTP allow the same origins.
export const SOCKET_CORS = { origin: allowList, credentials: true };

export default app;
