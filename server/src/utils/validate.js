import { HttpError } from "./httpError.js";

export const validate =
  (schema, key = "body") =>
  (req, _res, next) => {
    const parsed = schema.safeParse(req[key]);
    if (!parsed.success) {
      return next(new HttpError(400, "Validation failed", parsed.error.flatten()));
    }
    req[key] = parsed.data;
    next();
  };
