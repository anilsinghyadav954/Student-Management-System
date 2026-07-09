import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import connectDB from "./config/db.js";
import { verifyMailer } from "./config/mailer.js";

/**
 * Actual process entrypoint (npm start / npm run dev run this file).
 * Connects to the real database, verifies SMTP, then starts listening.
 * Kept separate from app.js so the Express app itself stays side-effect-free
 * and importable by the test suite.
 */
connectDB();

if (process.env.NODE_ENV !== "test") {
  verifyMailer();
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
});
