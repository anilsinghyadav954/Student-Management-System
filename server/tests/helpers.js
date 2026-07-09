import request from "supertest";
import app from "../app.js";
import User from "../models/User.js";
import Student from "../models/Student.js";

/**
 * Creates an admin user directly via the model (bypassing the API, since
 * there's no public admin-registration endpoint by design) and returns
 * both the user document and a valid access token.
 */
export const createAdminWithToken = async (overrides = {}) => {
  const user = await User.create({
    name: "Test Admin",
    email: "admin@test.com",
    password: "Admin@12345",
    role: "admin",
    ...overrides,
  });

  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: user.email, password: "Admin@12345" });

  return { user, token: res.body.data.token };
};

/**
 * Creates a student (User + Student) and returns both plus a valid token.
 * Mirrors what studentController.createStudent does internally, but
 * constructed directly for test speed/isolation.
 */
export const createStudentWithToken = async (overrides = {}) => {
  const user = await User.create({
    name: "Test Student",
    email: overrides.email || "student@test.com",
    password: "Student@12345",
    role: "student",
  });

  const student = await Student.create({
    user: user._id,
    studentId: overrides.studentId || `SMS-2026-${Math.floor(Math.random() * 9000 + 1000)}`,
    class: overrides.class || "10",
    section: overrides.section || "A",
    rollNumber: overrides.rollNumber || "1",
    dateOfBirth: "2010-01-01",
    gender: "Male",
    guardian: { name: "Test Guardian", phone: "9876543210" },
    ...overrides.studentFields,
  });

  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: user.email, password: "Student@12345" });

  return { user, student, token: res.body.data.token };
};

export { app };
