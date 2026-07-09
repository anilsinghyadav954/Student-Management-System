import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/User.js";

/**
 * Verifies the JWT on incoming requests and attaches the authenticated
 * user (minus password) to req.user. Accepts the token from either the
 * Authorization header ("Bearer <token>") or the httpOnly cookie.
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token provided");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      res.status(401);
      throw new Error("Not authorized, user no longer exists");
    }
    if (!user.isActive) {
      res.status(403);
      throw new Error("Your account has been deactivated. Contact the administrator.");
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401);
    throw new Error(
      error.name === "TokenExpiredError"
        ? "Session expired, please log in again"
        : "Not authorized, invalid token"
    );
  }
});

/**
 * Role-based access control. Usage: authorize("admin") or authorize("admin", "student").
 * Must run after protect() so req.user is populated.
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error("Not authorized, no user context");
    }
    if (!roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(`Role '${req.user.role}' is not permitted to access this resource`);
    }
    next();
  };
};
