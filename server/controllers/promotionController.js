import asyncHandler from "express-async-handler";
import Student from "../models/Student.js";
import Marks from "../models/Marks.js";
import PromotionHistory from "../models/PromotionHistory.js";
import { sendResponse } from "../utils/apiResponse.js";

export const getPromotionCandidates = asyncHandler(async (req, res) => {
  const { class: className, section } = req.query;
  if (!className || !section) {
    res.status(400);
    throw new Error("class and section query params are required");
  }

  const students = await Student.find({ class: className, section, status: "active" })
    .populate("profile", "name")
    .sort({ rollNumber: 1 });

  const studentIds = students.map((s) => s._id);
  const allMarks = await Marks.find({ student: { $in: studentIds } });
  const marksByStudent = new Map();
  allMarks.forEach((m) => {
    const key = m.student.toString();
    if (!marksByStudent.has(key)) marksByStudent.set(key, []);
    marksByStudent.get(key).push(m);
  });

  const candidates = students.map((student) => {
    const records = marksByStudent.get(student._id.toString()) || [];
    const hasFailingGrade = records.some((m) => m.grade === "F");
    const overallPercentage = records.length
      ? Number((records.reduce((sum, m) => sum + m.percentage, 0) / records.length).toFixed(1))
      : null;

    return {
      studentDbId: student._id,
      studentId: student.studentId,
      rollNumber: student.rollNumber,
      name: student.profile?.name || "-",
      overallPercentage,
      subjectCount: records.length,
      suggestedResult: hasFailingGrade ? "retained" : "promoted",
    };
  });

  sendResponse(res, 200, "Promotion candidates fetched successfully", candidates);
});

export const executePromotion = asyncHandler(async (req, res) => {
  const { fromClass, fromSection, toClass, toSection, academicYear, promotions } = req.body;

  if (!fromClass || !fromSection || !toClass || !toSection || !academicYear) {
    res.status(400);
    throw new Error("fromClass, fromSection, toClass, toSection, and academicYear are all required");
  }
  if (!Array.isArray(promotions) || promotions.length === 0) {
    res.status(400);
    throw new Error("No students to promote");
  }

  const promotedIds = promotions.filter((p) => p.result === "promoted").map((p) => p.student);

  if (promotedIds.length > 0) {
    await Student.updateMany(
      { _id: { $in: promotedIds } },
      { $set: { class: toClass, section: toSection } }
    );
  }

  const historyDocs = promotions.map((p) => ({
    student: p.student,
    academicYear,
    fromClass,
    fromSection,
    toClass: p.result === "promoted" ? toClass : fromClass,
    toSection: p.result === "promoted" ? toSection : fromSection,
    result: p.result,
    promotedBy: req.user._id,
  }));
  await PromotionHistory.insertMany(historyDocs, { ordered: false });

  const promotedCount = promotions.filter((p) => p.result === "promoted").length;
  const retainedCount = promotions.filter((p) => p.result === "retained").length;

  sendResponse(res, 200, `Promoted ${promotedCount} student(s), retained ${retainedCount}`, {
    promotedCount,
    retainedCount,
  });
});

export const getPromotionHistory = asyncHandler(async (req, res) => {
  const history = await PromotionHistory.find({ student: req.params.studentId })
    .populate("promotedBy", "name")
    .sort({ createdAt: -1 });
  sendResponse(res, 200, "Promotion history fetched successfully", history);
});