// src/controllers/pets.controller.js
import Pet from "../models/Pet.js";
import { httpError } from "../middleware/error.js";

/* ----------------------------- helpers ----------------------------- */

function isAdmin(user) {
  return user?.role === "superadmin" || user?.role === "admin";
}
const getUserId = (req) => req?.user?._id || req?.user?.id;

function parseBool(v) {
  if (v === true || v === false) return v;
  if (typeof v === "string") return v.toLowerCase() === "true" || v === "1";
  if (typeof v === "number") return v === 1;
  return undefined;
}

function extractUploadedPhotoPaths(req) {
  if (!req.files || req.files.length === 0) return [];
  return req.files.map((f) => `/uploads/${f.filename}`);
}

function buildTextFilter(q) {
  if (!q || typeof q !== "string") return {};
  const query = q.trim();
  if (!query) return {};
  return {
    $or: [
      { $text: { $search: query } },
      { name: { $regex: query, $options: "i" } },
      { breed: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
      { city: { $regex: query, $options: "i" } },
      { otherSpecies: { $regex: query, $options: "i" } },
    ],
  };
}

const ALLOWED_STATUSES = new Set(["available", "reserved", "adopted"]);
const ALLOWED_SORTS = new Set([
  "createdAt",
  "-createdAt",
  "ageMonths",
  "-ageMonths",
  "name",
  "-name",
]);

function normalizeSort(sort) {
  if (!sort || typeof sort !== "string") return "-createdAt";
  const s = sort.trim();
  return ALLOWED_SORTS.has(s) ? s : "-createdAt";
}

function withOwnerId(doc) {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : doc;
  obj.ownerId = obj.listedBy;
  return obj;
}

// keep only digits; return "" for falsy
function digitsOnly(v) {
  if (v == null) return "";
  return String(v).replace(/\D/g, "");
}

// ensure 10–15 digits or undefined if empty
function normalizeContactPhone(v) {
  const d = digitsOnly(v);
  if (!d) return undefined;
  if (!/^[0-9]{10,15}$/.test(d)) return null; // invalid marker
  return d;
}

/* ---------------------------- controllers --------------------------- */

// GET /pets
export async function listPets(req, res, next) {
  try {
    const {
      q,
      species,
      otherSpecies,
      speciesOther, // legacy alias
      gender,
      size,
      city,
      status,
      vaccinated,
      dewormed,
      sterilized,
      minAge,
      maxAge,
      mine,
      sort,
      page = 1,
      limit = 12,
    } = req.query;

    const filter = {};

    if (species) filter.species = species;

    const normalizedOther = otherSpecies ?? speciesOther;
    if (normalizedOther) {
      filter.otherSpecies = { $regex: String(normalizedOther).trim(), $options: "i" };
    }

    if (gender) filter.gender = gender;
    if (size) filter.size = size;
    if (city) filter.city = { $regex: String(city).trim(), $options: "i" };

    if (status && ALLOWED_STATUSES.has(String(status))) {
      filter.status = status;
    }

    const v1 = parseBool(vaccinated);
    if (v1 !== undefined) filter.vaccinated = v1;
    const v2 = parseBool(dewormed);
    if (v2 !== undefined) filter.dewormed = v2;
    const v3 = parseBool(sterilized);
    if (v3 !== undefined) filter.sterilized = v3;

    const age = {};
    if (minAge !== undefined) age.$gte = Number(minAge);
    if (maxAge !== undefined) age.$lte = Number(maxAge);
    if (Object.keys(age).length) filter.ageMonths = age;

    // mine filter (requires auth)
    const mineFlag = parseBool(mine);
    if (mineFlag) {
      const meId = getUserId(req);
      if (!meId) return next(httpError(401, "Login required to view your listings"));
      filter.listedBy = meId;
    }

    const textFilter = buildTextFilter(q);
    const finalFilter = Object.keys(textFilter).length ? { $and: [filter, textFilter] } : filter;

    const pageNum = Math.max(1, Number(page) || 1);
    const lim = Math.min(50, Math.max(1, Number(limit) || 12));
    const skip = (pageNum - 1) * lim;
    const sortBy = normalizeSort(sort);

    const [items, total] = await Promise.all([
      Pet.find(finalFilter).sort(sortBy).skip(skip).limit(lim),
      Pet.countDocuments(finalFilter),
    ]);

    res.json({
      success: true,
      meta: { total, page: pageNum, limit: lim, hasNext: skip + items.length < total, sort: sortBy },
      data: items.map(withOwnerId),
    });
  } catch (err) {
    next(err);
  }
}

// GET /pets/mine  (auth required)
export async function listMyPets(req, res, next) {
  try {
    const meId = getUserId(req);
    if (!meId) return next(httpError(401, "Login required"));

    const { status, page = 1, limit = 12, sort } = req.query;

    const filter = { listedBy: meId };
    if (status && ALLOWED_STATUSES.has(String(status))) {
      filter.status = status;
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const lim = Math.min(50, Math.max(1, Number(limit) || 12));
    const skip = (pageNum - 1) * lim;
    const sortBy = normalizeSort(sort);

    const [items, total] = await Promise.all([
      Pet.find(filter).sort(sortBy).skip(skip).limit(lim),
      Pet.countDocuments(filter),
    ]);

    res.json({
      success: true,
      meta: { total, page: pageNum, limit: lim, hasNext: skip + items.length < total, sort: sortBy },
      data: items.map(withOwnerId),
    });
  } catch (err) {
    next(err);
  }
}

// GET /pets/:id
export async function getPetById(req, res, next) {
  try {
    const { id } = req.params;
    const pet = await Pet.findById(id)
      .populate({ path: "listedBy", select: "fullname username phone" }); // <-- expose owner phone
    if (!pet) return next(httpError(404, "Pet not found"));
    res.json({ success: true, data: withOwnerId(pet) });
  } catch (err) {
    next(err);
  }
}

// POST /pets  (auth required)
export async function createPet(req, res, next) {
  try {
    const meId = getUserId(req);
    if (!meId) return next(httpError(401, "Login required"));

    const body = { ...req.body };

    // Optional: per-pet WhatsApp override
    if (body.contactPhone !== undefined) {
      const norm = normalizeContactPhone(body.contactPhone);
      if (norm === null) return next(httpError(400, "contactPhone must be 10-15 digits (numbers only)"));
      body.contactPhone = norm;
    }

    // Normalize legacy key
    body.otherSpecies = body.otherSpecies ?? body.speciesOther;
    delete body.speciesOther;

    // Convert booleans/number for multipart or string inputs
    ["vaccinated", "dewormed", "sterilized"].forEach((k) => {
      if (body[k] !== undefined) body[k] = parseBool(body[k]);
    });
    if (body.ageMonths !== undefined) body.ageMonths = Number(body.ageMonths);

    if (body.species === "other" && !body.otherSpecies) {
      return next(httpError(400, "otherSpecies is required when species is 'other'"));
    }

    // photos: merge JSON URLs + uploaded files
    const uploaded = extractUploadedPhotoPaths(req);
    const jsonPhotos = Array.isArray(body.photos) ? body.photos : (body.photos ? [body.photos] : []);
    body.photos = [...jsonPhotos, ...uploaded];

    const doc = await Pet.create({
      ...body,
      listedBy: meId,
      status: body.status && ALLOWED_STATUSES.has(body.status) ? body.status : "available",
    });

    res.status(201).json({ success: true, data: withOwnerId(doc) });
  } catch (err) {
    next(err);
  }
}

// PATCH /pets/:id  (auth required)
export async function updatePetById(req, res, next) {
  try {
    const { id } = req.params;
    const pet = await Pet.findById(id);
    if (!pet) return next(httpError(404, "Pet not found"));

    const meId = getUserId(req);
    const owner = String(pet.listedBy) === String(meId);
    if (!owner && !isAdmin(req.user)) return next(httpError(403, "Not allowed"));

    const body = { ...req.body };

    // Optional: per-pet WhatsApp override
    if (body.contactPhone !== undefined) {
      const norm = normalizeContactPhone(body.contactPhone);
      if (norm === null) return next(httpError(400, "contactPhone must be 10-15 digits (numbers only)"));
      body.contactPhone = norm;
    }

    // Normalize legacy key
    body.otherSpecies = body.otherSpecies ?? body.speciesOther;
    delete body.speciesOther;

    // Coerce types
    ["vaccinated", "dewormed", "sterilized"].forEach((k) => {
      if (body[k] !== undefined) body[k] = parseBool(body[k]);
    });
    if (body.ageMonths !== undefined) body.ageMonths = Number(body.ageMonths);

    if (
      body.species === "other" &&
      (body.otherSpecies ?? pet.otherSpecies) === undefined
    ) {
      return next(httpError(400, "otherSpecies is required when species is 'other'"));
    }

    // Append uploaded photos
    const uploaded = extractUploadedPhotoPaths(req);
    if (uploaded.length) {
      body.photos = Array.isArray(pet.photos) ? [...pet.photos, ...uploaded] : uploaded;
    }

    // Whitelist updatable fields (added contactPhone)
    const allowed = [
      "name",
      "species",
      "otherSpecies",
      "breed",
      "gender",
      "ageMonths",
      "size",
      "city",
      "vaccinated",
      "dewormed",
      "sterilized",
      "description",
      "photos",
      "status",
      "contactPhone", // <-- new
    ];
    const updates = {};
    for (const k of allowed) {
      if (body[k] !== undefined) updates[k] = body[k];
    }

    if (updates.status && !ALLOWED_STATUSES.has(updates.status)) {
      return next(httpError(400, "Invalid status"));
    }

    const updated = await Pet.findByIdAndUpdate(id, updates, { new: true });
    res.json({ success: true, data: withOwnerId(updated) });
  } catch (err) {
    next(err);
  }
}

// PATCH /pets/:id/status  (auth required)
export async function updatePetStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const pet = await Pet.findById(id);
    if (!pet) return next(httpError(404, "Pet not found"));

    const meId = getUserId(req);
    const owner = String(pet.listedBy) === String(meId);
    if (!owner && !isAdmin(req.user)) return next(httpError(403, "Not allowed"));

    if (!ALLOWED_STATUSES.has(String(status))) {
      return next(httpError(400, "Invalid status"));
    }

    pet.status = status;
    await pet.save();

    res.json({ success: true, data: { id: pet.id, status: pet.status } });
  } catch (err) {
    next(err);
  }
}

// DELETE /pets/:id  (auth required)
export async function deletePetById(req, res, next) {
  try {
    const { id } = req.params;
    const pet = await Pet.findById(id);
    if (!pet) return next(httpError(404, "Pet not found"));

    const meId = getUserId(req);
    const owner = String(pet.listedBy) === String(meId);
    if (!owner && !isAdmin(req.user)) return next(httpError(403, "Not allowed"));

    await Pet.findByIdAndDelete(id);
    res.json({ success: true, data: { id } });
  } catch (err) {
    next(err);
  }
}
