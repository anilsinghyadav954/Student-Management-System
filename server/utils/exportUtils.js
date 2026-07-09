import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";

/**
 * Streams a PDF table of students directly to the HTTP response.
 * Uses pdfkit's low-level drawing API since it has no built-in table
 * helper — this keeps the layout simple, readable, and dependency-light.
 */
export const exportStudentsPDF = (res, students) => {
  const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=students-report.pdf");
  doc.pipe(res);

  doc.fontSize(16).font("Helvetica-Bold").text("Student Management System — Student Report", { align: "center" });
  doc.fontSize(9).font("Helvetica").text(`Generated on ${new Date().toLocaleString()}`, { align: "center" });
  doc.moveDown(1);

  const columns = [
    { key: "studentId", label: "Student ID", width: 90 },
    { key: "name", label: "Name", width: 130 },
    { key: "email", label: "Email", width: 160 },
    { key: "class", label: "Class", width: 60 },
    { key: "section", label: "Section", width: 60 },
    { key: "rollNumber", label: "Roll No.", width: 60 },
    { key: "status", label: "Status", width: 70 },
  ];

  let y = doc.y + 5;
  const startX = 30;
  const rowHeight = 20;

  const drawRow = (row, isHeader = false) => {
    let x = startX;
    doc.font(isHeader ? "Helvetica-Bold" : "Helvetica").fontSize(9);
    columns.forEach((col) => {
      doc.text(String(row[col.key] ?? ""), x, y, { width: col.width, ellipsis: true });
      x += col.width;
    });
    y += rowHeight;
  };

  const headerRow = columns.reduce((acc, col) => ({ ...acc, [col.key]: col.label }), {});
  drawRow(headerRow, true);
  doc.moveTo(startX, y).lineTo(startX + columns.reduce((s, c) => s + c.width, 0), y).stroke();
  y += 4;

  students.forEach((student) => {
    if (y > doc.page.height - 50) {
      doc.addPage();
      y = 40;
    }
    drawRow({
      studentId: student.studentId,
      name: student.profile?.name || student.user?.name || "-",
      email: student.profile?.email || student.user?.email || "-",
      class: student.class,
      section: student.section,
      rollNumber: student.rollNumber,
      status: student.status,
    });
  });

  doc.end();
};

/**
 * Streams an Excel (.xlsx) workbook of students directly to the HTTP response.
 */
export const exportStudentsExcel = async (res, students) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Student Management System";
  const sheet = workbook.addWorksheet("Students");

  sheet.columns = [
    { header: "Student ID", key: "studentId", width: 18 },
    { header: "Name", key: "name", width: 25 },
    { header: "Email", key: "email", width: 30 },
    { header: "Phone", key: "phone", width: 15 },
    { header: "Class", key: "class", width: 10 },
    { header: "Section", key: "section", width: 10 },
    { header: "Roll No.", key: "rollNumber", width: 12 },
    { header: "Gender", key: "gender", width: 10 },
    { header: "Guardian Name", key: "guardianName", width: 22 },
    { header: "Guardian Phone", key: "guardianPhone", width: 16 },
    { header: "Status", key: "status", width: 12 },
    { header: "Admission Date", key: "admissionDate", width: 16 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } };

  students.forEach((student) => {
    sheet.addRow({
      studentId: student.studentId,
      name: student.profile?.name || student.user?.name || "-",
      email: student.profile?.email || student.user?.email || "-",
      phone: student.profile?.phone || student.user?.phone || "-",
      class: student.class,
      section: student.section,
      rollNumber: student.rollNumber,
      gender: student.gender,
      guardianName: student.guardian?.name,
      guardianPhone: student.guardian?.phone,
      status: student.status,
      admissionDate: student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : "-",
    });
  });

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", "attachment; filename=students-report.xlsx");

  await workbook.xlsx.write(res);
  res.end();
};
