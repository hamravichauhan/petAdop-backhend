import { body, param } from "express-validator";

export const updateMeValidator = [
  body("fullname").optional().isString().trim().isLength({ min: 2, max: 100 }),
  body("avatar").optional().isString().trim().isLength({ max: 500 }),
];

export const changePasswordValidator = [
  body("currentPassword")
    .exists().withMessage("currentPassword is required")
    .isString().isLength({ min: 8, max: 128 }),
  body("newPassword")
    .exists().withMessage("newPassword is required")
    .isString().isLength({ min: 8, max: 128 }),
];

export const userIdParamValidator = [
  param("id").isMongoId().withMessage("Invalid user id"),
];

export const adminUpdateUserValidator = [
  ...userIdParamValidator,
  body("fullname").optional().isString().trim().isLength({ min: 2, max: 100 }),
  body("avatar").optional().isString().trim().isLength({ max: 500 }),
  body("role").optional().isIn(["user", "admin"]),
];
