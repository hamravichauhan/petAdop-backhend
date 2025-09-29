import { body, param, query } from "express-validator";

export const petIdParamValidator = [
  param("id").isMongoId().withMessage("Invalid pet id"),
];

export const listPetsQueryValidator = [
  query("q").optional().isString().trim().isLength({ max: 200 }),
  query("species").optional().isIn(["dog", "cat", "rabbit", "bird", "other"]),
  query("otherSpecies").optional().isString().trim().isLength({ min: 1, max: 60 }),
  query("gender").optional().isIn(["male", "female", "unknown"]),
  query("size").optional().isIn(["small", "medium", "large"]),
  query("city").optional().isString().trim().isLength({ min: 1, max: 60 }),
  query("status").optional().isIn(["available", "reserved", "adopted"]),
  query("vaccinated").optional().isIn(["true", "false"]),
  query("dewormed").optional().isIn(["true", "false"]),
  query("sterilized").optional().isIn(["true", "false"]),
  query("minAge").optional().isInt({ min: 0 }),
  query("maxAge").optional().isInt({ min: 0 }),
  query("mine").optional().isIn(["0", "1"]),
  query("sort").optional().isString().trim().isLength({ max: 40 }), // e.g. "-createdAt" or "ageMonths"
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 50 }),
];

export const createPetValidator = [
  body("name").isString().trim().isLength({ min: 1, max: 100 }),
  body("species").isIn(["dog", "cat", "rabbit", "bird", "other"]),
  body("otherSpecies")
    .if(body("species").equals("other"))
    .exists().withMessage("otherSpecies is required when species is 'other'")
    .bail()
    .isString().trim().isLength({ min: 1, max: 60 }),
  body("breed").optional().isString().trim().isLength({ max: 100 }),
  body("gender").optional().isIn(["male", "female", "unknown"]),
  body("ageMonths").optional().isInt({ min: 0, max: 600 }),
  body("size").optional().isIn(["small", "medium", "large"]),
  body("city").optional().isString().trim().isLength({ min: 1, max: 60 }),
  body("vaccinated").optional().isBoolean(),
  body("dewormed").optional().isBoolean(),
  body("sterilized").optional().isBoolean(),
  body("description").optional().isString().trim().isLength({ max: 2000 }),
  body("photos").optional().isArray({ min: 0, max: 10 }),
  body("photos.*").optional().isString().trim().isLength({ max: 500 }),
  body("status").optional().isIn(["available", "reserved", "adopted"]),
];

export const updatePetValidator = [
  body("species").optional().isIn(["dog", "cat", "rabbit", "bird", "other"]),
  body("otherSpecies")
    .optional({ nullable: true })
    .if(body("species").equals("other"))
    .isString().trim().isLength({ min: 1, max: 60 }),
  body("name").optional().isString().trim().isLength({ min: 1, max: 100 }),
  body("breed").optional().isString().trim().isLength({ max: 100 }),
  body("gender").optional().isIn(["male", "female", "unknown"]),
  body("ageMonths").optional().isInt({ min: 0, max: 600 }),
  body("size").optional().isIn(["small", "medium", "large"]),
  body("city").optional().isString().trim().isLength({ min: 1, max: 60 }),
  body("vaccinated").optional().isBoolean(),
  body("dewormed").optional().isBoolean(),
  body("sterilized").optional().isBoolean(),
  body("description").optional().isString().trim().isLength({ max: 2000 }),
  body("photos").optional().isArray({ min: 0, max: 10 }),
  body("photos.*").optional().isString().trim().isLength({ max: 500 }),
  body("status").optional().isIn(["available", "reserved", "adopted"]),
];

export const updatePetStatusValidator = [
  ...petIdParamValidator,
  body("status").isIn(["available", "reserved", "adopted"]),
];
