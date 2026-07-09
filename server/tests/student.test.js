import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import request from "supertest";
import { connectTestDB, clearTestDB, closeTestDB } from "./db.js";
import { app, createAdminWithToken, createStudentWithToken } from "./helpers.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

const validStudentPayload = {
  name: "Jane Doe",
  email: "jane@test.com",
  password: "Password123",
  phone: "9876543210",
  class: "10",
  section: "A",
  rollNumber: "5",
  dateOfBirth: "2010-05-15",
  gender: "Female",
  guardian: { name: "John Doe", phone: "9876543211" },
};

describe("POST /api/students (create)", () => {
  it("allows an admin to create a student", async () => {
    const { token } = await createAdminWithToken();
    const res = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${token}`)
      .send(validStudentPayload);

    expect(res.status).toBe(201);
    expect(res.body.data.studentId).toMatch(/^SMS-\d{4}-\d{4}$/);
    expect(res.body.data.profile.email).toBe("jane@test.com");
  });

  it("rejects duplicate email", async () => {
    const { token } = await createAdminWithToken();
    await request(app).post("/api/students").set("Authorization", `Bearer ${token}`).send(validStudentPayload);
    const res = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${token}`)
      .send(validStudentPayload);

    expect(res.status).toBe(400);
  });

  it("rejects missing required fields with a validation error", async () => {
    const { token } = await createAdminWithToken();
    const res = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Incomplete" });

    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it("blocks a student from creating another student", async () => {
    const { token } = await createStudentWithToken();
    const res = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${token}`)
      .send(validStudentPayload);

    expect(res.status).toBe(403);
  });

  it("blocks unauthenticated requests", async () => {
    const res = await request(app).post("/api/students").send(validStudentPayload);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/students (list, search, filter, pagination)", () => {
  it("returns a paginated list", async () => {
    const { token } = await createAdminWithToken();
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post("/api/students")
        .set("Authorization", `Bearer ${token}`)
        .send({ ...validStudentPayload, email: `student${i}@test.com`, rollNumber: String(i + 1) });
    }

    const res = await request(app).get("/api/students?page=1&limit=2").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.meta.total).toBe(3);
    expect(res.body.meta.pages).toBe(2);
  });

  it("searches by name", async () => {
    const { token } = await createAdminWithToken();
    await request(app).post("/api/students").set("Authorization", `Bearer ${token}`).send(validStudentPayload);

    const res = await request(app).get("/api/students?search=Jane").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it("filters by class", async () => {
    const { token } = await createAdminWithToken();
    await request(app).post("/api/students").set("Authorization", `Bearer ${token}`).send(validStudentPayload);
    await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...validStudentPayload, email: "other@test.com", class: "11", rollNumber: "9" });

    const res = await request(app).get("/api/students?class=11").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].class).toBe("11");
  });
});

describe("PUT /api/students/:id (update)", () => {
  it("updates a student's academic fields", async () => {
    const { token } = await createAdminWithToken();
    const createRes = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${token}`)
      .send(validStudentPayload);

    const res = await request(app)
      .put(`/api/students/${createRes.body.data._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ section: "B", status: "inactive" });

    expect(res.status).toBe(200);
    expect(res.body.data.section).toBe("B");
    expect(res.body.data.status).toBe("inactive");
  });

  it("404s for a non-existent student", async () => {
    const { token } = await createAdminWithToken();
    const res = await request(app)
      .put("/api/students/507f1f77bcf86cd799439011")
      .set("Authorization", `Bearer ${token}`)
      .send({ section: "B" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/students/:id", () => {
  it("deletes a student and their linked user account", async () => {
    const { token } = await createAdminWithToken();
    const createRes = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${token}`)
      .send(validStudentPayload);

    const deleteRes = await request(app)
      .delete(`/api/students/${createRes.body.data._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(deleteRes.status).toBe(200);

    const getRes = await request(app)
      .get(`/api/students/${createRes.body.data._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(getRes.status).toBe(404);
  });
});

describe("GET /api/students/me/profile", () => {
  it("lets a student fetch their own academic profile", async () => {
    const { token, student } = await createStudentWithToken();
    const res = await request(app).get("/api/students/me/profile").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(student._id.toString());
  });
});
