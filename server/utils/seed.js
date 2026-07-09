import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";

dotenv.config();

/**
 * Creates the first Admin account from ADMIN_NAME / ADMIN_EMAIL /
 * ADMIN_PASSWORD in .env. Safe to re-run — it skips creation if an
 * admin with that email already exists.
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

  const existingAdmin = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });

  if (existingAdmin) {
    console.log(`ℹ️  Admin already exists for ${ADMIN_EMAIL}, skipping.`);
  } else {
    await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD, // hashed automatically by the User model's pre-save hook
      role: "admin",
      isActive: true,
    });
    console.log(`✅ Admin account created: ${ADMIN_EMAIL}`);
    console.log("   ⚠️  Log in and change this password immediately.");
  }

  await mongoose.connection.close();
  process.exit(0);
};

seedAdmin().catch((error) => {
  console.error(`❌ Seeding failed: ${error.message}`);
  process.exit(1);
});
