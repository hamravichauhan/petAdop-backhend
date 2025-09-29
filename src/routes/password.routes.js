// src/routes/password.routes.js
import { Router } from "express";
import { forgotPassword, resetPassword } from "../controllers/password.controller.js";

const router = Router();

// POST /api/auth/password/forgot  { email }
router.post("/forgot", forgotPassword);

// POST /api/auth/password/reset   { token, password }
router.post("/reset", resetPassword);

export default router;
