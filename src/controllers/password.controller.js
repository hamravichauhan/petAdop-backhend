// src/controllers/password.controller.js
import crypto from "node:crypto";
import { User } from "../models/User.js";
import PasswordResetToken from "../models/PasswordResetToken.js";

const RESET_TTL_MIN = Number(process.env.PASSWORD_RESET_TTL_MIN || 30);
// OPTIONAL: return the reset link in API response for easy local testing
const SEND_LINK_IN_RESPONSE = String(process.env.SEND_RESET_LINK_IN_RESPONSE || "") === "true";

function normalizeEmail(email) {
  return String(email || "").toLowerCase().trim();
}

function buildResetUrl(token) {
  const appUrl = process.env.APP_BASE_URL || "http://localhost:5173";
  // If you pass extra query (like redirect), validate/whitelist it before appending.
  return `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

// Replace with nodemailer if you have SMTP; here we log to server console.
async function sendResetEmailLike(email, link) {
  console.log(`[Password Reset] Send to ${email}: ${link}`);
  return true;
}

export async function forgotPassword(req, res, next) {
  try {
    const email = normalizeEmail(req?.body?.email);
    if (!email) {
      // Always return success to avoid leaking which emails exist
      return res.status(200).json({ success: true });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      // Same privacy behavior
      return res.status(200).json({ success: true });
    }

    // Invalidate any previous tokens for this user
    await PasswordResetToken.updateMany(
      { user: user._id, used: false },
      { $set: { used: true } }
    );

    // Create a fresh token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + RESET_TTL_MIN * 60 * 1000);

    await PasswordResetToken.create({ user: user._id, token, expiresAt });

    const link = buildResetUrl(token);
    await sendResetEmailLike(user.email, link);

    // In non-production (or when explicitly enabled), surface the link to speed up testing
    const isDev = process.env.NODE_ENV !== "production";
    if (isDev || SEND_LINK_IN_RESPONSE) {
      return res.json({ success: true, link });
    }

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const token = String(req?.body?.token || "");
    const password = String(req?.body?.password || "");

    if (!token || !password) {
      return res.status(400).json({ success: false, message: "token and password are required" });
    }

    // Keep consistent with your validators elsewhere (8–128)
    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({ success: false, message: "Password must be 8–128 characters" });
    }

    const row = await PasswordResetToken.findOne({ token, used: false });
    if (!row || row.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: "Invalid or expired token" });
    }

    const user = await User.findById(row.user).select("+password");
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid token" });
    }

    // Let the User pre-save hook hash the password
    user.password = password;
    await user.save();

    // Burn the token
    row.used = true;
    await row.save();

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
