// src/middleware/auth.js
import jwt from "jsonwebtoken";

/** Support multiple env var names for flexibility */
function getAccessSecret() {
  return (
    process.env.ACCESS_TOKEN_SECRET ||
    process.env.JWT_ACCESS_SECRET ||
    process.env.JWT_SECRET
  );
}

/** Verify access token and attach `req.user` */
export const auth = (req, res, next) => {
  try {
    const header = req.headers.authorization || req.headers.Authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Missing or invalid Authorization header" });
    }

    const secret = getAccessSecret();
    if (!secret) {
      return res
        .status(500)
        .json({ success: false, message: "Server misconfigured: missing ACCESS_TOKEN_SECRET" });
    }

    const payload = jwt.verify(token, secret);

    // Normalize user id so controllers can rely on req.user._id and req.user.id
    const userId = payload._id || payload.id || payload.sub;
    req.user = {
      ...payload,
      _id: userId ? String(userId) : undefined,
      id: userId ? String(userId) : undefined,
    };

    return next();
  } catch (e) {
    const message =
      e?.name === "TokenExpiredError"
        ? "Token expired"
        : "Invalid or malformed token";
    return res.status(401).json({ success: false, message });
  }
};

/** Restrict access to users with `role=superadmin` */
export const requireSuperAdmin = (req, res, next) => {
  if (req.user?.role !== "superadmin") {
    return res
      .status(403)
      .json({ success: false, message: "Forbidden: superadmin only" });
  }
  next();
};
