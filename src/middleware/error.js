// src/middleware/error.js

// 404 helper (optional — use in app.js if you want a consistent 404 shape)
export function notFound(req, res, _next) {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.originalUrl} not found` }
  });
}

// Convenience helper to create HTTP errors without extra deps
export function httpError(status, message, details) {
  const e = new Error(message || "Error");
  e.status = status;
  if (details) e.details = details;
  return e;
}

// Centralized error handler (use as the last middleware in app.js)
export function errorHandler(err, req, res, _next) {
  // Normalize status
  const status =
    err.status ??
    err.statusCode ??
    (err.name === "ValidationError" ? 400 :
     err.name === "CastError"       ? 400 :
     err.code === 11000             ? 409 : 500);

  const code =
    err.code && typeof err.code === "string"
      ? err.code
      : (status >= 500 ? "INTERNAL_SERVER_ERROR" : "ERROR");

  const message =
    err.message ||
    (status === 409 ? "Duplicate key" : "Something went wrong");

  // Log in non-production
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.error("❌ ERROR:", { status, message, stack: err.stack, details: err.details, errors: err.errors });
  }

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(err.details ? { details: err.details } : {}),
      // Bubble up field-level errors from validators/ODM if present
      ...(err.errors ? { errors: err.errors } : {})
    }
  });
}

// Keep default export for any places that did: `import errorHandler from ...`
export default errorHandler;
