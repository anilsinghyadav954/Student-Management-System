import asyncHandler from "express-async-handler";
import ExcelJS from "exceljs";
import User from "../models/User.js";
import Student from "../models/Student.js";
import { sendResponse } from "../utils/apiResponse.js";
import {
  COLUMN_DEFINITIONS,
  generateSampleTemplate,
  parseUploadedFile,
  generateRandomPassword,
  parseYesNo,
  parseStatus,
} from "../utils/bulkImportUtils.js";

const MOBILE_REGEX = /^[0-9]{10}$/;
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const VALID_GENDERS = ["male", "female", "other"];
const VALID_BLOOD_GROUPS = ["a+", "a-", "b+", "b-", "ab+", "ab-", "o+", "o-", ""];

/**
 * @desc   Download the sample Excel template with all required columns
 * @route  GET /api/students/import/template
 * @access Private/Admin
 */
export const downloadTemplate = asyncHandler(async (req, res) => {
  await generateSampleTemplate(res);
});

/**
 * Validates a single parsed row's fields (format-level checks only — NOT
 * duplicate checks, which need the whole batch + a DB round trip and are
 * done separately in previewImport for efficiency: one DB query for all
 * rows instead of one per row).
 */
const validateRowFields = (data) => {
  const errors = [];

  if (!data.admissionNumber) errors.push("Admission Number is missing");
  if (!data.rollNumber) errors.push("Roll Number is missing");
  if (!data.name) errors.push("Student Name is missing");
  if (!data.class) errors.push("Class is missing");
  if (!data.section) errors.push("Section is missing");
  if (!data.academicSession) errors.push("Academic Session is missing");
  if (!data.fatherName) errors.push("Father Name is missing");

  if (!data.gender || !VALID_GENDERS.includes(String(data.gender).trim().toLowerCase())) {
    errors.push("Gender must be Male, Female, or Other");
  }

  if (!data.dateOfBirth || isNaN(Date.parse(data.dateOfBirth))) {
    errors.push("Invalid Date of Birth");
  }
  if (data.admissionDate && isNaN(Date.parse(data.admissionDate))) {
    errors.push("Invalid Admission Date");
  }

  if (!data.parentMobile || !MOBILE_REGEX.test(data.parentMobile)) {
    errors.push("Invalid Parent Mobile Number (must be 10 digits)");
  }
  if (data.studentMobile && !MOBILE_REGEX.test(data.studentMobile)) {
    errors.push("Invalid Mobile Number (must be 10 digits)");
  }

  if (data.email && !EMAIL_REGEX.test(data.email)) {
    errors.push("Invalid Email format");
  }

  if (data.bloodGroup && !VALID_BLOOD_GROUPS.includes(String(data.bloodGroup).trim().toLowerCase())) {
    errors.push("Invalid Blood Group");
  }

  if (data.password && String(data.password).length < 8) {
    errors.push("Password must be at least 8 characters if provided");
  }

  return errors;
};

/**
 * @desc   Upload + parse + validate an Excel/CSV file WITHOUT inserting
 *         anything. Returns every row with a status (valid/invalid/duplicate)
 *         and per-row error messages, so the frontend can render a preview
 *         table before the admin commits to importing.
 * @route  POST /api/students/import/preview
 * @access Private/Admin
 */
export const previewImport = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("No file uploaded");
  }

  let parsedRows;
  try {
    parsedRows = await parseUploadedFile(req.file.buffer, req.file.originalname);
  } catch (error) {
    res.status(400);
    throw new Error(`Could not read the file: ${error.message}`);
  }

  if (parsedRows.length === 0) {
    res.status(400);
    throw new Error("The file contains no data rows");
  }

  // Batch-fetch everything needed for duplicate checks in 2 queries total,
  // instead of one query per row (critical for the 500–5000 row target).
  const admissionNumbers = parsedRows.map((r) => String(r.data.admissionNumber || "").toUpperCase()).filter(Boolean);
  const emails = parsedRows.map((r) => String(r.data.email || "").toLowerCase()).filter(Boolean);

  const [existingStudents, existingUsers] = await Promise.all([
    Student.find({ studentId: { $in: admissionNumbers } }).select("studentId"),
    User.find({ email: { $in: emails } }).select("email"),
  ]);
  const existingStudentIds = new Set(existingStudents.map((s) => s.studentId));
  const existingEmailSet = new Set(existingUsers.map((u) => u.email));

  // Track within-FILE duplicates as we go.
  const seenAdmissionNumbers = new Map();
  const seenEmails = new Map();
  const seenRollInClassSection = new Map();

  const rows = parsedRows.map(({ rowNumber, data }) => {
    const errors = validateRowFields(data);

    const admissionNumber = String(data.admissionNumber || "").toUpperCase();
    const email = String(data.email || "").toLowerCase();
    const rollKey = `${data.class}|${data.section}|${data.rollNumber}`.toLowerCase();

    // Within-file duplicate checks
    if (admissionNumber) {
      if (seenAdmissionNumbers.has(admissionNumber)) {
        errors.push(`Duplicate Admission Number (also on row ${seenAdmissionNumbers.get(admissionNumber)})`);
      } else {
        seenAdmissionNumbers.set(admissionNumber, rowNumber);
      }
    }
    if (data.rollNumber) {
      if (seenRollInClassSection.has(rollKey)) {
        errors.push(`Duplicate Roll Number within this Class/Section (also on row ${seenRollInClassSection.get(rollKey)})`);
      } else {
        seenRollInClassSection.set(rollKey, rowNumber);
      }
    }
    if (email) {
      if (seenEmails.has(email)) {
        errors.push(`Duplicate Email (also on row ${seenEmails.get(email)})`);
      } else {
        seenEmails.set(email, rowNumber);
      }
    }

    // Against-database checks
    const isDuplicateInDB = admissionNumber && existingStudentIds.has(admissionNumber);
    if (email && existingEmailSet.has(email) && !isDuplicateInDB) {
      errors.push("Email already used by another existing account");
    }

    let status;
    if (errors.length > 0) status = "invalid";
    else if (isDuplicateInDB) status = "duplicate";
    else status = "valid";

    return { rowNumber, data, errors, status };
  });

  const summary = {
    total: rows.length,
    valid: rows.filter((r) => r.status === "valid").length,
    invalid: rows.filter((r) => r.status === "invalid").length,
    duplicate: rows.filter((r) => r.status === "duplicate").length,
  };

  sendResponse(res, 200, "File parsed and validated", { summary, rows });
});

/**
 * @desc   Actually insert (or update, or skip) the rows the admin
 *         confirmed after reviewing the preview. Never stops on a single
 *         row's failure — every row is attempted independently and the
 *         failure is recorded in the results, not thrown.
 * @route  POST /api/students/import/execute
 * @body   { rows: [{ rowNumber, data, status }], duplicateAction: "skip"|"update" }
 * @access Private/Admin
 */
export const executeImport = asyncHandler(async (req, res) => {
  const { rows, duplicateAction } = req.body;

  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400);
    throw new Error("No rows to import");
  }

  const results = { imported: 0, updated: 0, skipped: 0, failed: 0, details: [], credentials: [] };

  const BATCH_SIZE = 25;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (row) => {
        const { rowNumber, data, status } = row;

        try {
          if (status === "invalid") {
            results.failed++;
            results.details.push({ rowNumber, admissionNumber: data.admissionNumber, result: "failed", reason: "Row failed validation" });
            return;
          }

          if (status === "duplicate") {
            if (duplicateAction === "skip") {
              results.skipped++;
              results.details.push({ rowNumber, admissionNumber: data.admissionNumber, result: "skipped" });
              return;
            }
            if (duplicateAction === "update") {
              const existingStudent = await Student.findOne({ studentId: String(data.admissionNumber).toUpperCase() });
              if (!existingStudent) {
                results.failed++;
                results.details.push({ rowNumber, admissionNumber: data.admissionNumber, result: "failed", reason: "Existing student not found" });
                return;
              }
              await User.findByIdAndUpdate(existingStudent.user, {
                name: data.name,
                phone: data.studentMobile || undefined,
              });
              Object.assign(existingStudent, {
                rollNumber: data.rollNumber,
                class: data.class,
                section: data.section,
                dateOfBirth: data.dateOfBirth,
                gender: data.gender,
                bloodGroup: data.bloodGroup || "",
                motherName: data.motherName || "",
                studentMobile: data.studentMobile || "",
                aadhaarNumber: data.aadhaarNumber || "",
                category: data.category || "",
                previousSchool: data.previousSchool || "",
                academicSession: data.academicSession,
                transportRequired: parseYesNo(data.transportRequired),
                hostelRequired: parseYesNo(data.hostelRequired),
                status: parseStatus(data.status),
                address: { street: data.address || "", city: data.city || "", state: data.state || "", pincode: data.pincode || "" },
                guardian: { name: data.fatherName, phone: data.parentMobile, email: existingStudent.guardian?.email || "" },
              });
              await existingStudent.save();
              results.updated++;
              results.details.push({ rowNumber, admissionNumber: data.admissionNumber, result: "updated" });
              return;
            }
            results.skipped++;
            results.details.push({ rowNumber, admissionNumber: data.admissionNumber, result: "skipped" });
            return;
          }

          // status === "valid" -> create a new User + Student
          const email = data.email || `${String(data.admissionNumber).toLowerCase()}@student.local`;
          const password = data.password || generateRandomPassword();

          const user = await User.create({
            name: data.name,
            email,
            password,
            phone: data.studentMobile || undefined,
            role: "student",
          });

          const student = await Student.create({
            user: user._id,
            studentId: String(data.admissionNumber).toUpperCase(),
            class: data.class,
            section: data.section,
            rollNumber: data.rollNumber,
            dateOfBirth: data.dateOfBirth,
            gender: data.gender,
            bloodGroup: data.bloodGroup || "",
            motherName: data.motherName || "",
            studentMobile: data.studentMobile || "",
            aadhaarNumber: data.aadhaarNumber || "",
            category: data.category || "",
            house: data.house || "",
            previousSchool: data.previousSchool || "",
            academicSession: data.academicSession,
            admissionDate: data.admissionDate || undefined,
            transportRequired: parseYesNo(data.transportRequired),
            hostelRequired: parseYesNo(data.hostelRequired),
            status: parseStatus(data.status),
            address: { street: data.address || "", city: data.city || "", state: data.state || "", pincode: data.pincode || "" },
            guardian: { name: data.fatherName, phone: data.parentMobile, email: "" },
          });

          results.imported++;
          results.details.push({ rowNumber, admissionNumber: student.studentId, result: "imported" });
          results.credentials.push({
            name: data.name,
            admissionNumber: student.studentId,
            username: data.username || student.studentId,
            email,
            password,
          });
        } catch (error) {
          results.failed++;
          results.details.push({ rowNumber, admissionNumber: data.admissionNumber, result: "failed", reason: error.message });
        }
      })
    );
  }

  sendResponse(res, 200, "Import completed", results);
});

/**
 * @desc   Formats a credentials array (returned by executeImport) into a
 *         downloadable Excel file. Stateless — the plaintext passwords are
 *         never stored anywhere server-side.
 * @route  POST /api/students/import/credentials-excel
 * @access Private/Admin
 */
export const downloadCredentialsExcel = asyncHandler(async (req, res) => {
  const { credentials } = req.body;
  if (!Array.isArray(credentials) || credentials.length === 0) {
    res.status(400);
    throw new Error("No credentials provided");
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Login Credentials");
  sheet.columns = [
    { header: "Student Name", key: "name", width: 25 },
    { header: "Admission Number", key: "admissionNumber", width: 20 },
    { header: "Username", key: "username", width: 20 },
    { header: "Login Email", key: "email", width: 30 },
    { header: "Password", key: "password", width: 18 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } };
  credentials.forEach((c) => sheet.addRow(c));

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=student-login-credentials.xlsx");
  await workbook.xlsx.write(res);
  res.end();
});

/**
 * @desc   Export all existing students in the SAME column format as the
 *         import template, so an admin can download, edit offline, and
 *         re-upload to bulk-update.
 * @route  GET /api/students/export-template
 * @access Private/Admin
 */
export const exportStudentsAsTemplate = asyncHandler(async (req, res) => {
  const students = await Student.find().populate("profile", "name email phone").sort({ studentId: 1 });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Students");
  sheet.columns = COLUMN_DEFINITIONS.map((col) => ({ header: col.header, key: col.key, width: 20 }));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } };

  students.forEach((s) => {
    sheet.addRow({
      admissionNumber: s.studentId,
      rollNumber: s.rollNumber,
      name: s.profile?.name || "",
      gender: s.gender,
      dateOfBirth: s.dateOfBirth ? s.dateOfBirth.toISOString().split("T")[0] : "",
      fatherName: s.guardian?.name || "",
      motherName: s.motherName || "",
      studentMobile: s.studentMobile || s.profile?.phone || "",
      parentMobile: s.guardian?.phone || "",
      email: s.profile?.email || "",
      address: s.address?.street || "",
      city: s.address?.city || "",
      state: s.address?.state || "",
      pincode: s.address?.pincode || "",
      academicSession: s.academicSession || "",
      class: s.class,
      section: s.section,
      bloodGroup: s.bloodGroup || "",
      category: s.category || "",
      aadhaarNumber: s.aadhaarNumber || "",
      admissionDate: s.admissionDate ? s.admissionDate.toISOString().split("T")[0] : "",
      previousSchool: s.previousSchool || "",
      transportRequired: s.transportRequired ? "Yes" : "No",
      hostelRequired: s.hostelRequired ? "Yes" : "No",
      status: s.status === "active" ? "Active" : "Inactive",
      username: "",
      password: "",
    });
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=all-students-export.xlsx");
  await workbook.xlsx.write(res);
  res.end();
});