import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";

dotenv.config();

/**
 * Creates the first Admin account from ADMIN_NAME / ADMIN_EMAIL /
 * ADMIN_PASSWORD in .env.
 *
 * Safe to re-run at any time, including after changing ADMIN_EMAIL:
 *  - No admin exists yet          → creates one with the .env values
 *  - An admin exists with the     → does nothing (already correct)
 *    same email as ADMIN_EMAIL
 *  - An admin exists with a       → UPDATES that admin's email/name to
 *    DIFFERENT email                match .env, instead of creating a
 *                                    second admin account
 *
 * The old version of this script looked up the existing admin by email
 * (`User.findOne({ email: ADMIN_EMAIL })`). That meant if you seeded once
 * with a placeholder email, then changed ADMIN_EMAIL in .env and re-ran
 * `npm run seed`, the lookup wouldn't find the original admin (wrong email)
 * and would create a SECOND admin account instead of fixing the first one
 * — leaving the original placeholder-email admin active and orphaned.
 *
 * Usage: npm run seed
 */
const seedAdmin = async () => {
  await connectDB();

  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error("❌ ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD must be set in .env");
    process.exit(1);
  }

  const normalizedEmail = ADMIN_EMAIL.toLowerCase();

  // Look up by ROLE, not by email — this is what makes re-running the
  // script after changing ADMIN_EMAIL fix the existing admin in place
  // rather than creating a duplicate.
  const existingAdmin = await User.findOne({ role: "admin" });

  if (existingAdmin && existingAdmin.email === normalizedEmail) {
    console.log(`ℹ️  Admin already exists with the correct email (${normalizedEmail}). No changes made.`);
  } else if (existingAdmin) {
    // An admin exists but with a different (e.g. placeholder) email.
    // Guard against ADMIN_EMAIL colliding with some other account first.
    const emailTaken = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: existingAdmin._id },
    });
    if (emailTaken) {
      console.error(
        `❌ ${normalizedEmail} is already in use by another account (role: ${emailTaken.role}). Choose a different ADMIN_EMAIL or free up that email first.`
      );
      process.exit(1);
    }

    const oldEmail = existingAdmin.email;
    existingAdmin.email = normalizedEmail;
    existingAdmin.name = ADMIN_NAME;
    await existingAdmin.save();
    console.log(`✅ Updated existing admin: ${oldEmail} → ${normalizedEmail}`);
    console.log("   Password was left unchanged (not overwritten). Use 'Forgot Password' if you need to reset it.");
  } else {
    await User.create({
      name: ADMIN_NAME,
      email: normalizedEmail,
      password: ADMIN_PASSWORD, // hashed automatically by the User model's pre-save hook
      role: "admin",
      isActive: true,
    });
    console.log(`✅ Admin account created: ${normalizedEmail}`);
    console.log("   ⚠️  Log in and change this password immediately.");
  }

  await mongoose.connection.close();
  process.exit(0);
};

seedAdmin().catch((error) => {
  console.error(`❌ Seeding failed: ${error.message}`);
  process.exit(1);
});