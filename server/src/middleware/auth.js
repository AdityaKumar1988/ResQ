import { verifyAccess } from "../utils/jwt.js";
import { HttpError } from "../utils/httpError.js";

export function authenticate(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, "Missing bearer token"));
  try {
    req.user = verifyAccess(token);
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired token"));
  }
}

export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, "Unauthenticated"));
    if (!roles.includes(req.user.role)) return next(new HttpError(403, "Insufficient role"));
    next();
  };
