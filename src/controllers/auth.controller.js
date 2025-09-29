// src/controllers/auth.controller.js
import jwt from "jsonwebtoken";
// If your model exports default (recommended):
import {User} from "../models/User.js";
// If your model exports named:  import { User } from "../models/User.js";

const useCookie = (process.env.USE_REFRESH_COOKIE || "false").toLowerCase() === "true";

/* -------------------- helpers -------------------- */
function maybeSetRefreshCookie(res, refreshToken) {
  if (!useCookie) return;
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

function buildDefaultAvatar({ username = "", fullname = "" }) {
  const seed = (username || fullname || "friend").trim().replace(/\s+/g, "-").toLowerCase();
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear`;
}

const digitsOnly = (v) => (v == null ? "" : String(v).replace(/\D/g, ""));

/* -------------------- controllers -------------------- */

export const register = async (req, res, next) => {
  try {
    let {
      username,
      fullname,
      email,
      password,
      avatar,
      contactPhone, // preferred from frontend
      phone,        // fallback if someone sends `phone`
    } = req.body || {};

    // Normalize
    username = (username || "").trim();
    fullname = (fullname || "").trim();
    email = (email || "").trim().toLowerCase();
    avatar = (avatar || "").trim();

    // Phone: accept either key, sanitize to digits, validate 10–15
    let phoneDigits = digitsOnly(contactPhone ?? phone);
    if (!phoneDigits || !/^[0-9]{10,15}$/.test(phoneDigits)) {
      return res.status(400).json({
        success: false,
        message: "Phone must be 10–15 digits (numbers only)",
      });
    }

    // Basic validation (schema will enforce too)
    if (!username || !fullname || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "username, fullname, email and password are required" });
    }
    if (password.length < 8 || password.length > 16) {
      return res.status(400).json({ success: false, message: "Password must be 8–16 characters" });
    }

    // Ensure unique email/username (case-insensitive username)
    const exists = await User.findOne({
      $or: [{ email }, { username: new RegExp(`^${username}$`, "i") }],
    });
    if (exists) {
      return res.status(409).json({ success: false, message: "Email or username already in use" });
    }

    // Default avatar if not provided
    if (!avatar) {
      avatar = buildDefaultAvatar({ username, fullname });
    }

    // Create user (include phoneDigits)
    const created = await User.create({
      username,
      fullname,
      email,
      password,
      avatar,
      phone: phoneDigits, // <-- store sanitized digits
    });

    // Public user (no password)
    const user = await User.findById(created._id);

    // Tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    maybeSetRefreshCookie(res, refreshToken);

    return res.status(201).json({
      success: true,
      user,
      accessToken,
      tokens: {
        accessToken,
        refreshToken: useCookie ? undefined : refreshToken,
      },
    });
  } catch (e) {
    if (e?.code === 11000) {
      // duplicate key (email / username / (optional) phone if unique)
      return res.status(409).json({ success: false, message: "Email or username already in use" });
    }
    next(e);
  }
};

export const login = async (req, res, next) => {
  try {
    // Accept email/username/identifier
    let { email, username, identifier, password } = req.body || {};
    email = (email || (identifier?.includes("@") ? identifier : "") || "").trim().toLowerCase();
    username = (username || (!email && identifier ? identifier : "") || "").trim();

    if (!password || (!email && !username)) {
      return res.status(400).json({ success: false, message: "Provide email or username and password" });
    }

    // Query by email or username; MUST select password because schema has select:false
    const query = email ? { email } : { username: new RegExp(`^${username}$`, "i") };
    const userWithPassword = await User.findOne(query).select("+password");
    if (!userWithPassword) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const ok = await userWithPassword.isPasswordCorrect(password);
    if (!ok) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // fetch clean public view
    const user = await User.findById(userWithPassword._id);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    maybeSetRefreshCookie(res, refreshToken);

    return res.json({
      success: true,
      user,
      accessToken,
      tokens: {
        accessToken,
        refreshToken: useCookie ? undefined : refreshToken,
      },
    });
  } catch (e) {
    next(e);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const fromCookie = req.cookies?.refreshToken;
    const fromBody = req.body?.refreshToken;
    const refreshToken = useCookie ? fromCookie : (fromBody || fromCookie);

    if (!refreshToken) {
      return res.status(401).json({ success: false, message: "Refresh token required" });
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: "Invalid refresh token" });
    }

    const user = await User.findById(payload._id);
    if (!user) return res.status(401).json({ success: false, message: "User not found" });

    const accessToken = user.generateAccessToken();

    return res.json({
      success: true,
      accessToken,
      tokens: { accessToken },
    });
  } catch (e) {
    next(e);
  }
};

export const logout = async (_req, res, _next) => {
  if (useCookie) {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  }
  return res.json({ success: true, message: "Logged out" });
};
