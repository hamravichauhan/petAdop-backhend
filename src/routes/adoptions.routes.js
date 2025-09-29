// src/routes/adoptions.routes.js
import { Router } from "express";

const router = Router();

// example
router.get("/", (req, res) => {
  res.json({ success: true, message: "adoptions route ok" });
});

export default router; // <-- REQUIRED for `import adoptionsRoutes from "..."`
