// src/models/Pet.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const VALID_SPECIES = ["dog", "cat", "rabbit", "bird", "other"];

const petSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },

    // Predefined species
    species: {
      type: String,
      enum: VALID_SPECIES,
      required: true,
      lowercase: true,
      trim: true,
    },

    // If species === "other", user must fill this
    otherSpecies: {
      type: String,
      trim: true,
      maxlength: 80,
      validate: {
        validator: function (v) {
          if (this.species === "other") {
            return v && v.trim().length > 0;
          }
          return true; // not required otherwise
        },
        message: "Please specify the species when 'other' is selected.",
      },
    },

    breed: {
      type: String,
      trim: true,
      maxlength: 80,
    },

    gender: {
      type: String,
      enum: ["male", "female", "unknown"],
      default: "unknown",
      lowercase: true,
      trim: true,
    },

    ageMonths: {
      type: Number,
      default: 0,
      min: [0, "ageMonths cannot be negative"],
    },

    size: {
      type: String,
      enum: ["small", "medium", "large"],
      default: "medium",
      lowercase: true,
      trim: true,
    },

    city: {
      type: String,
      index: true,
      trim: true,
      maxlength: 80,
    },

    vaccinated: { type: Boolean, default: false },
    dewormed: { type: Boolean, default: false },
    sterilized: { type: Boolean, default: false },

    description: { type: String, trim: true, maxlength: 2000 },

    photos: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: ["available", "reserved", "adopted"],
      default: "available",
      lowercase: true,
      index: true,
    },

    listedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // NEW: Optional per-pet phone override. If present, use this for WhatsApp.
    contactPhone: {
      type: String,
      trim: true,
      validate: {
        validator: (v) => !v || /^[0-9]{10,15}$/.test(v),
        message: "contactPhone must be 10-15 digits (numbers only)",
      },
      index: true,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Text search index
petSchema.index({ name: "text", breed: "text", description: "text", city: "text" });

// Virtual for age in years/months
petSchema.virtual("ageLabel").get(function () {
  if (this.ageMonths < 12) return `${this.ageMonths} mo`;
  const yrs = Math.floor(this.ageMonths / 12);
  const mos = this.ageMonths % 12;
  return mos ? `${yrs}y ${mos}m` : `${yrs}y`;
});

// ✅ Virtual alias for frontend: ownerId = listedBy
petSchema.virtual("ownerId").get(function () {
  return this.listedBy;
});

export default mongoose.model("Pet", petSchema);
