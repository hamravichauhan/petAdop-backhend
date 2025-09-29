// src/routes/auth.routes.js
import { Router } from "express";
import { body } from "express-validator";
import { handleValidation } from "../middleware/validate.js";
import { register, login, refresh, logout } from "../controllers/auth.controller.js";

const router = Router();

/* ----------------- Middleware ----------------- */
/** Normalize phone: accept `contactPhone` or `phone`, digits-only in req.body.phone */
function normalizePhone(req, _res, next) {
  const raw = req.body?.contactPhone ?? req.body?.phone;
  if (raw !== undefined) {
    req.body.phone = String(raw).replace(/\D/g, ""); // keep only digits
  }
  next();
}

/* ----------------- Health check ----------------- */
router.get("/", (_req, res) => res.json({ ok: true, where: "auth" }));

/* ----------------- Register ----------------- */
router.post(
  "/register",
  normalizePhone,
  [
    body("username")
      .isString().withMessage("Username must be a string")
      .trim()
      .isLength({ min: 3, max: 32 }).withMessage("Username must be 3–32 characters"),

    body("fullname")
      .isString().withMessage("Full name must be a string")
      .trim()
      .isLength({ min: 2, max: 80 }).withMessage("Full name must be 2–80 characters"),

    body("email")
      .isString().withMessage("Email must be a string")
      .trim()
      .isEmail().withMessage("Enter a valid email address"),

    body("password")
      .isString().withMessage("Password must be a string")
      .isLength({ min: 8, max: 16 }).withMessage("Password must be 8–16 characters"),

    body("phone")
      .exists({ checkFalsy: true }).withMessage("Phone is required")
      .isLength({ min: 10, max: 15 }).withMessage("Phone must be 10–15 digits")
      .matches(/^\d+$/).withMessage("Phone must contain digits only"),

    body("avatar")
      .optional()
      .isString().withMessage("Avatar must be a string"),
  ],
  handleValidation,
  register
);

/* ----------------- Login ----------------- */
router.post(
  "/login",
  [
    body("email")
      .isString().withMessage("Email must be a string")
      .trim()
      .isEmail().withMessage("Enter a valid email address"),

    body("password")
      .isString().withMessage("Password must be a string")
      .isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  ],
  handleValidation,
  login
);

/* ----------------- Refresh / Logout ----------------- */
router.post("/refresh", refresh);
router.post("/logout", logout);

export default router;
