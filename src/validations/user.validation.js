// src/validations/user.validation.js
import { body, param } from "express-validator";

/**
 * Validators for self-service profile update
 */
export const updateMeValidator = [
  body("fullname")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("fullname must be 2–100 chars"),

  body("avatar")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("avatar URL too long (max 500 chars)"),

  // If you want to allow optional email/username updates later:
  // body("email").optional().isEmail().withMessage("valid email required"),
  // body("username").optional().isString().isLength({ min: 3, max: 32 }),
];

/**
 * Validators for password change
 */
export const changePasswordValidator = [
  body("currentPassword")
    .exists().withMessage("currentPassword is required")
    .isString()
    .isLength({ min: 8, max: 128 })
    .withMessage("currentPassword must be 8–128 chars"),

  body("newPassword")
    .exists().withMessage("newPassword is required")
    .isString()
    .isLength({ min: 8, max: 128 })
    .withMessage("newPassword must be 8–128 chars"),
];

/**
 * Common user id param validator
 */
export const userIdParamValidator = [
  param("id").isMongoId().withMessage("Invalid user id"),
];

/**
 * Admin-level validator for updating any user
 */
export const adminUpdateUserValidator = [
  ...userIdParamValidator,

  body("fullname")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 }),

  body("avatar")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 }),

  body("role")
    .optional()
    .isIn(["user", "admin", "superadmin"])
    .withMessage("role must be user, admin, or superadmin"),
];
