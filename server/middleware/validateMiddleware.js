import { validationResult } from "express-validator";

/**
 * Runs after express-validator's check()/body() chains on a route.
 * Collects all validation errors and responds with a single, clean
 * 400 response instead of letting the request fall through.
 *
 * Usage:
 *   router.post("/register", [body("email").isEmail(), ...], validate, controllerFn)
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: formatted,
    });
  }
  next();
};
