import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import request from "supertest";
import { connectTestDB, clearTestDB, closeTestDB } from "./db.js";
import { app, createAdminWithToken, createStudentWithToken } from "./helpers.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

const todayISO = () => new Date().toISOString().split("T")[0];

describe("POST /api/attendance/mark", () => {
  it("marks attendance for a class in one call", async () => {
    const { token: adminToken } = await createAdminWithToken();
    const { student } = await createStudentWithToken();

    const res = await request(app)
      .post("/api/attendance/mark")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        date: todayISO(),
        class: student.class,
        section: student.section,
        records: [{ student: student._id, status: "present" }],
      });

    expect(res.status).toBe(200);
    expect(res.body.data[0].status).toBe("present");
  });

  it("upserts instead of erroring when re-marking the same day", async () => {
    const { token: adminToken } = await createAdminWithToken();
    const { student } = await createStudentWithToken();
    const payload = {
      date: todayISO(),
      class: student.class,
      section: student.section,
      records: [{ student: student._id, status: "present" }],
    };

    await request(app).post("/api/attendance/mark").set("Authorization", `Bearer ${adminToken}`).send(payload);
    const secondRes = await request(app)
      .post("/api/attendance/mark")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...payload, records: [{ student: student._id, status: "absent" }] });

    expect(secondRes.status).toBe(200);
    expect(secondRes.body.data[0].status).toBe("absent");
  });

  it("blocks a student from marking attendance", async () => {
    const { token, student } = await createStudentWithToken();
    const res = await request(app)
      .post("/api/attendance/mark")
      .set("Authorization", `Bearer ${token}`)
      .send({
        date: todayISO(),
        class: student.class,
        section: student.section,
        records: [{ student: student._id, status: "present" }],
      });

    expect(res.status).toBe(403);
  });
});

describe("GET /api/attendance/student/:studentId (ownership enforcement)", () => {
  it("lets a student view their own attendance", async () => {
    const { token, student } = await createStudentWithToken();
    const res = await request(app)
      .get(`/api/attendance/student/${student._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.percentage).toBeDefined();
  });

  it("blocks a student from viewing another student's attendance", async () => {
    const { token: studentAToken } = await createStudentWithToken({ email: "a@test.com", rollNumber: "1" });
    const { student: studentB } = await createStudentWithToken({ email: "b@test.com", rollNumber: "2" });

    const res = await request(app)
      .get(`/api/attendance/student/${studentB._id}`)
      .set("Authorization", `Bearer ${studentAToken}`);

    expect(res.status).toBe(403);
  });

  it("lets an admin view any student's attendance", async () => {
    const { token: adminToken } = await createAdminWithToken();
    const { student } = await createStudentWithToken();

    const res = await request(app)
      .get(`/api/attendance/student/${student._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});

describe("GET /api/attendance/monthly-report", () => {
  it("calculates correct percentages for a class", async () => {
    const { token: adminToken } = await createAdminWithToken();
    const { student } = await createStudentWithToken();

    // Mark 3 present, 1 absent across 4 different days
    const dates = ["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04"];
    const statuses = ["present", "present", "present", "absent"];
    for (let i = 0; i < dates.length; i++) {
      await request(app)
        .post("/api/attendance/mark")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          date: dates[i],
          class: student.class,
          section: student.section,
          records: [{ student: student._id, status: statuses[i] }],
        });
    }

    const res = await request(app)
      .get(`/api/attendance/monthly-report?class=${student.class}&section=${student.section}&month=6&year=2026`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const row = res.body.data.find((r) => r.student.id === student._id.toString());
    expect(row.present).toBe(3);
    expect(row.absent).toBe(1);
    expect(row.percentage).toBe(75);
  });
});
