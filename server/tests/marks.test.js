import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import request from "supertest";
import { connectTestDB, clearTestDB, closeTestDB } from "./db.js";
import { app, createAdminWithToken, createStudentWithToken } from "./helpers.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

describe("POST /api/marks (add)", () => {
  it("auto-calculates the correct grade", async () => {
    const { token: adminToken } = await createAdminWithToken();
    const { student } = await createStudentWithToken();

    const res = await request(app)
      .post("/api/marks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        student: student._id,
        subject: "Mathematics",
        examType: "Mid Term",
        academicYear: "2025-2026",
        marksObtained: 92,
        totalMarks: 100,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.grade).toBe("A+");
  });

  it("rejects marksObtained greater than totalMarks", async () => {
    const { token: adminToken } = await createAdminWithToken();
    const { student } = await createStudentWithToken();

    const res = await request(app)
      .post("/api/marks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        student: student._id,
        subject: "Science",
        examType: "Quiz",
        academicYear: "2025-2026",
        marksObtained: 150,
        totalMarks: 100,
      });

    expect(res.status).toBe(500); // Mongoose validation error surfaces via the generic error handler
  });

  it("upserts on re-submission for the same subject/exam/year", async () => {
    const { token: adminToken } = await createAdminWithToken();
    const { student } = await createStudentWithToken();
    const base = {
      student: student._id,
      subject: "English",
      examType: "Unit Test",
      academicYear: "2025-2026",
      totalMarks: 50,
    };

    await request(app).post("/api/marks").set("Authorization", `Bearer ${adminToken}`).send({ ...base, marksObtained: 30 });
    const secondRes = await request(app)
      .post("/api/marks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...base, marksObtained: 45 });

    expect(secondRes.status).toBe(201);
    expect(secondRes.body.data.marksObtained).toBe(45);
  });

  it("blocks a student from adding marks", async () => {
    const { token, student } = await createStudentWithToken();
    const res = await request(app)
      .post("/api/marks")
      .set("Authorization", `Bearer ${token}`)
      .send({
        student: student._id,
        subject: "Math",
        examType: "Quiz",
        academicYear: "2025-2026",
        marksObtained: 10,
        totalMarks: 20,
      });

    expect(res.status).toBe(403);
  });
});

describe("GET /api/marks/student/:studentId (ownership + summary)", () => {
  it("computes the correct overall percentage summary", async () => {
    const { token: adminToken } = await createAdminWithToken();
    const { student, token: studentToken } = await createStudentWithToken();

    await request(app).post("/api/marks").set("Authorization", `Bearer ${adminToken}`).send({
      student: student._id, subject: "Math", examType: "Unit Test", academicYear: "2025-2026",
      marksObtained: 80, totalMarks: 100,
    });
    await request(app).post("/api/marks").set("Authorization", `Bearer ${adminToken}`).send({
      student: student._id, subject: "Science", examType: "Unit Test", academicYear: "2025-2026",
      marksObtained: 40, totalMarks: 50,
    });

    const res = await request(app)
      .get(`/api/marks/student/${student._id}`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    // (80 + 40) / (100 + 50) = 80%
    expect(res.body.data.summary.overallPercentage).toBe(80);
  });

  it("blocks a student from viewing another student's marks", async () => {
    const { token: studentAToken } = await createStudentWithToken({ email: "a@test.com", rollNumber: "1" });
    const { student: studentB } = await createStudentWithToken({ email: "b@test.com", rollNumber: "2" });

    const res = await request(app)
      .get(`/api/marks/student/${studentB._id}`)
      .set("Authorization", `Bearer ${studentAToken}`);

    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/marks/:id", () => {
  it("deletes a marks record", async () => {
    const { token: adminToken } = await createAdminWithToken();
    const { student } = await createStudentWithToken();

    const createRes = await request(app).post("/api/marks").set("Authorization", `Bearer ${adminToken}`).send({
      student: student._id, subject: "Art", examType: "Quiz", academicYear: "2025-2026",
      marksObtained: 18, totalMarks: 20,
    });

    const deleteRes = await request(app)
      .delete(`/api/marks/${createRes.body.data._id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(200);
  });
});
