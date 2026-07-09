import jwt from "jsonwebtoken";

/**
 * Signs a short-lived access token carrying the user's id and role.
 * Role is embedded so authorize() middleware can check permissions
 * without hitting the DB on every request.
 */
export const generateAccessToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

/**
 * Signs a longer-lived refresh token, used only to mint new access
 * tokens. Kept separate from the access token secret so a leaked
 * access token can't be used to forge a refresh token.
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || "30d",
  });
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

/**
 * Sends the access token as an httpOnly cookie (XSS-safe) AND in the
 * JSON body (so SPA clients storing it in memory/localStorage also work).
 * Using both gives flexibility; the frontend in this project uses the
 * JSON body + localStorage, but the cookie is a safety net / CSRF-hardening
 * option for future use.
 */
export const setTokenCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};
