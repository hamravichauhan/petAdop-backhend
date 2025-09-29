// src/routes/pets.routes.js
import { Router } from "express";
import { auth } from "../middleware/auth.js";
import {
  listPets,
  listMyPets, // ✅ added
  getPetById,
  createPet,
  updatePetById,
  deletePetById,
  updatePetStatus,
} from "../controllers/pets.controller.js";
import {
  listPetsQueryValidator,
  createPetValidator,
  updatePetValidator,
  petIdParamValidator,
  updatePetStatusValidator,
} from "../validations/pet.validation.js";
import { handleValidation } from "../middleware/validate.js";
import { upload } from "../middleware/upload.js"; // ✅ import only `upload`

// Multer handler: up to 5 photos in field "photos"
const uploadPetPhotos = upload.array("photos", 5);

// Normalize legacy key speciesOther -> otherSpecies BEFORE validation
function normalizeOtherSpecies(req, _res, next) {
  if (req.body && typeof req.body === "object") {
    if (req.body.speciesOther && !req.body.otherSpecies) {
      req.body.otherSpecies = req.body.speciesOther;
      delete req.body.speciesOther;
    }
  }
  next();
}

// NEW: sanitize optional contactPhone to digits-only BEFORE validation
function normalizeContactPhone(req, _res, next) {
  if (req.body && typeof req.body === "object" && req.body.contactPhone !== undefined) {
    const digits = String(req.body.contactPhone).replace(/\D/g, "");
    // if empty after stripping, set to undefined so validator can treat as optional
    req.body.contactPhone = digits || undefined;
  }
  next();
}

const router = Router();

/** Public: list & view */
router.get("/", listPetsQueryValidator, handleValidation, listPets);

// ✅ My listings (must appear BEFORE `/:id`)
router.get("/mine", auth, listPetsQueryValidator, handleValidation, listMyPets);

router.get("/:id", petIdParamValidator, handleValidation, getPetById);

/** Auth required: create/update/delete (with optional photos upload) */
// For create: parse multipart first so validators see body
router.post(
  "/",
  auth,
  uploadPetPhotos,
  normalizeOtherSpecies,
  normalizeContactPhone,        // ✅ sanitize contactPhone
  createPetValidator,
  handleValidation,
  createPet
);

// For update: validate :id early, then parse multipart, then validate body
router.patch(
  "/:id",
  auth,
  petIdParamValidator,
  uploadPetPhotos,
  normalizeOtherSpecies,
  normalizeContactPhone,        // ✅ sanitize contactPhone
  updatePetValidator,
  handleValidation,
  updatePetById
);

router.delete("/:id", auth, petIdParamValidator, handleValidation, deletePetById);

/** Auth required: status change (available | reserved | adopted) */
router.patch(
  "/:id/status",
  auth,
  petIdParamValidator,
  updatePetStatusValidator,
  handleValidation,
  updatePetStatus
);

export default router;
