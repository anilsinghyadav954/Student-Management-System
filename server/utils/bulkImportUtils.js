import ExcelJS from "exceljs";
import crypto from "crypto";
import { Readable } from "stream";

/**
 * Single source of truth for the bulk-import column layout. Both the
 * downloadable sample template AND the uploaded-file parser use this list,
 * so they can never drift out of sync with each other.
 */
export const COLUMN_DEFINITIONS = [
  { header: "Admission Number", key: "admissionNumber", required: true },
  { header: "Roll Number", key: "rollNumber", required: true },
  { header: "Student Name", key: "name", required: true },
  { header: "Gender", key: "gender", required: true },
  { header: "Date of Birth", key: "dateOfBirth", required: true },
  { header: "Father Name", key: "fatherName", required: true },
  { header: "Mother Name", key: "motherName", required: false },
  { header: "Mobile Number", key: "studentMobile", required: false },
  { header: "Parent Mobile Number", key: "parentMobile", required: true },
  { header: "Email", key: "email", required: false },
  { header: "Address", key: "address", required: false },
  { header: "City", key: "city", required: false },
  { header: "State", key: "state", required: false },
  { header: "PIN Code", key: "pincode", required: false },
  { header: "Academic Session", key: "academicSession", required: true },
  { header: "Class", key: "class", required: true },
  { header: "Section", key: "section", required: true },
  { header: "Blood Group", key: "bloodGroup", required: false },
  { header: "Category", key: "category", required: false },
  { header: "Aadhaar Number (Optional)", key: "aadhaarNumber", required: false },
  { header: "Admission Date", key: "admissionDate", required: false },
  { header: "Previous School (Optional)", key: "previousSchool", required: false },
  { header: "Transport Required (Yes/No)", key: "transportRequired", required: false },
  { header: "Hostel Required (Yes/No)", key: "hostelRequired", required: false },
  { header: "Student Status (Active/Inactive)", key: "status", required: false },
  { header: "Username (optional)", key: "username", required: false },
  { header: "Password (optional)", key: "password", required: false },
];

const SAMPLE_ROW = {
  admissionNumber: "SMS-2026-0101",
  rollNumber: "1",
  name: "Rahul Kumar",
  gender: "Male",
  dateOfBirth: "2012-05-14",
  fatherName: "Suresh Kumar",
  motherName: "Sunita Kumar",
  studentMobile: "",
  parentMobile: "9876543210",
  email: "rahul.kumar@example.com",
  address: "123 MG Road",
  city: "Lucknow",
  state: "Uttar Pradesh",
  pincode: "226001",
  academicSession: "2025-2026",
  class: "10",
  section: "A",
  bloodGroup: "B+",
  category: "General",
  aadhaarNumber: "",
  admissionDate: "2025-04-01",
  previousSchool: "",
  transportRequired: "No",
  hostelRequired: "No",
  status: "Active",
  username: "",
  password: "",
};

/**
 * Streams the downloadable sample Excel template — header row (styled)
 * plus one filled example row so the admin can see the expected format.
 */
export const generateSampleTemplate = async (res) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Students");

  sheet.columns = COLUMN_DEFINITIONS.map((col) => ({ header: col.header, key: col.key, width: 20 }));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } };

  sheet.addRow(SAMPLE_ROW);

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=student-import-template.xlsx");
  await workbook.xlsx.write(res);
  res.end();
};

/**
 * Parses an uploaded .xlsx/.xls/.csv buffer into an array of plain row
 * objects, matched by HEADER TEXT (case-insensitive, trimmed) rather than
 * column position — so the import still works even if the admin reorders
 * columns in the file, as long as the header text is unchanged.
 */
export const parseUploadedFile = async (buffer, originalFilename) => {
  const workbook = new ExcelJS.Workbook();
  const isCSV = /\.csv$/i.test(originalFilename);

  if (isCSV) {
    await workbook.csv.read(Readable.from(buffer.toString("utf-8")));
  } else {
    await workbook.xlsx.load(buffer);
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("The uploaded file has no sheets");

  const headerRow = sheet.getRow(1);
  const headerMap = {}; // column index -> our internal key
  headerRow.eachCell((cell, colNumber) => {
    const text = String(cell.value ?? "").trim().toLowerCase();
    const match = COLUMN_DEFINITIONS.find((c) => c.header.toLowerCase() === text);
    if (match) headerMap[colNumber] = match.key;
  });

  if (Object.keys(headerMap).length === 0) {
    throw new Error("Could not recognize any columns — please use the downloaded sample template's headers");
  }

  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    const isEmpty = row.values.every((v) => v === null || v === undefined || v === "");
    if (isEmpty) return;

    const rowData = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const key = headerMap[colNumber];
      if (!key) return;
      let value = cell.value;
      // ExcelJS returns Date objects for date cells, and rich-text/formula
      // objects for some cells — normalize everything to plain strings.
      if (value instanceof Date) {
        value = value.toISOString().split("T")[0];
      } else if (value && typeof value === "object" && "text" in value) {
        value = value.text;
      } else if (value === null || value === undefined) {
        value = "";
      } else {
        value = String(value).trim();
      }
      rowData[key] = value;
    });

    rows.push({ rowNumber, data: rowData });
  });

  return rows;
};

/**
 * Generates a random, reasonably strong password for accounts where the
 * admin left the Password column blank.
 */
export const generateRandomPassword = () => {
  return crypto.randomBytes(9).toString("base64").replace(/[+/=]/g, "").slice(0, 12) + "1A";
};

const YES_VALUES = new Set(["yes", "y", "true", "1"]);
export const parseYesNo = (value) => YES_VALUES.has(String(value).trim().toLowerCase());

export const parseStatus = (value) => {
  const v = String(value || "").trim().toLowerCase();
  return v === "inactive" ? "inactive" : "active"; // defaults to active
};