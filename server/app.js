import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import { errorHandler, notFound } from "./middleware/errorMiddleware.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import marksRoutes from "./routes/marksRoutes.js";
import noticeRoutes from "./routes/noticeRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import userRoutes from "./routes/userRoutes.js";

/**
 * Builds and returns the configured Express app WITHOUT connecting to the
 * database or starting a listener. Kept separate from server.js so tests
 * can import this directly (e.g. via supertest) and point it at an
 * in-memory MongoDB instance, without spinning up a real network listener
 * or touching the production database.
 */
const app = express();

// Render, Vercel, and most PaaS providers sit behind a reverse proxy.
// Without this, express-rate-limit would key off the proxy's IP (making
// rate limiting useless) and `secure` cookies would never be set.
app.set("trust proxy", 1);

// ------------------------------------------------------------------
// Security & core middleware
// ------------------------------------------------------------------
app.use(helmet());
// CLIENT_URL supports a comma-separated list, since Vercel generates a new
// preview URL for every branch/PR in addition to the stable production domain.
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server/tools requests with no Origin header (e.g. curl, health checks)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Global rate limiter — protects all API routes from brute force / abuse.
// Skipped entirely in the test environment so test suites aren't rate-limited.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
  skip: () => process.env.NODE_ENV === "test",
});
app.use("/api", apiLimiter);

// ------------------------------------------------------------------
// Health check
// ------------------------------------------------------------------
app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, message: "SMS API is running 🚀" });
});

// ------------------------------------------------------------------
// Routes
// ------------------------------------------------------------------
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/marks", marksRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);

// ------------------------------------------------------------------
// Error handling (must be last)
// ------------------------------------------------------------------
app.use(notFound);
app.use(errorHandler);

export default app;
