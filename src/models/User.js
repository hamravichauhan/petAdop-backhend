// src/models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    fullname: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    // Make avatar optional and provide a default based on username/fullname
    avatar: {
      type: String,
      trim: true,
      required: false,
      default: function () {
        const seed = (this.username || this.fullname || "friend")
          .toString()
          .trim()
          .replace(/\s+/g, "-")
          .toLowerCase();
        return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
          seed
        )}&backgroundType=gradientLinear`;
      },
    },
    email: {
      type: String,
      required: [true, "email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "invalid email"],
      index: true,
    },
    password: {
      type: String,
      required: [true, "password is required"],
      select: false,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (v) => /^[0-9]{10,15}$/.test(v),
        message: "Phone must be 10-15 digits (numbers only)",
      },
    },
    // OLX-style: everyone is "user", only rare "superadmin"
    role: {
      type: String,
      enum: ["user", "superadmin"],
      default: "user",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.password;
        return ret;
      },
    },
    toObject: {
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.password;
        return ret;
      },
    },
  }
);

// Hash password when changed
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Instance methods
userSchema.methods.isPasswordCorrect = function (password) {
  return bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullname: this.fullname,
      role: this.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { _id: this._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  );
};

export const User = mongoose.model("User", userSchema);
