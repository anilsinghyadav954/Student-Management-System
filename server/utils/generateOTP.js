import crypto from "crypto";

/**
 * Generates a 6-digit numeric OTP as a string (e.g. "042917").
 * Leading zeros are preserved because it's returned as a string.
 */
export const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * OTPs are stored hashed in the DB (same principle as passwords) so that
 * a database leak doesn't expose valid, usable OTPs.
 */
export const hashOTP = (otp) => {
  return crypto.createHash("sha256").update(otp).digest("hex");
};

export const getOTPExpiry = () => {
  const minutes = Number(process.env.OTP_EXPIRE_MINUTES) || 10;
  return new Date(Date.now() + minutes * 60 * 1000);
};
