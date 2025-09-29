import { Router } from "express";
import { body } from "express-validator";
import { getMe, updateMe } from "../controllers/users.controller.js";
import { handleValidation } from "../middleware/validate.js";
import { auth } from "../middleware/auth.js";

const router = Router();

/** GET current user */
router.get("/me", auth, getMe);

/** PATCH current user
 *  - fullname: optional, 2–80 chars
 *  - avatar: optional string
 *  - phone: optional but if present must be 10–15 digits (numbers only)
 */
router.patch(
  "/me",
  auth,
  [
    body("fullname")
      .optional()
      .isString()
      .trim()
      .isLength({ min: 2, max: 80 })
      .withMessage("fullname must be 2–80 characters"),
    body("avatar").optional().isString().withMessage("avatar must be a string"),
    body("phone")
      .optional()
      .isString()
      .withMessage("phone must be a string")
      .customSanitizer((v) => String(v).replace(/\D/g, "")) // strip non-digits
      .isLength({ min: 10, max: 15 })
      .withMessage("phone must be 10–15 digits"),
  ],
  handleValidation,
  updateMe
);

export default router;
