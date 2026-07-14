import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";

/**
 * @param rows [{ studentId, rollNumber, name, present, absent, leave, holidayCount, sundayCount, workingDays, percentage }]
 */
export const exportAttendancePDF = (res, meta, rows) => {
  const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=attendance-${meta.class}-${meta.section}-${meta.month}-${meta.year}.pdf`);
  doc.pipe(res);

  doc.fontSize(15).font("Helvetica-Bold").text("Attendance Report", { align: "center" });
  doc.fontSize(10).font("Helvetica").text(
    `Class: ${meta.class}-${meta.section}   |   Month: ${meta.monthName} ${meta.year}   |   Working Days: ${meta.workingDaysInMonth}`,
    { align: "center" }
  );
  doc.moveDown(1);

  const columns = [
    { key: "rollNumber", label: "Roll No", width: 55 },
    { key: "name", label: "Student Name", width: 140 },
    { key: "present", label: "Present", width: 60 },
    { key: "absent", label: "Absent", width: 60 },
    { key: "leave", label: "Leave", width: 55 },
    { key: "holidayCount", label: "Holiday", width: 60 },
    { key: "sundayCount", label: "Sunday", width: 60 },
    { key: "workingDays", label: "Working Days", width: 85 },
    { key: "percentage", label: "Attendance %", width: 85 },
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

  rows.forEach((row) => {
    if (y > doc.page.height - 50) {
      doc.addPage();
      y = 40;
    }
    drawRow({ ...row, percentage: `${row.percentage}%` });
  });

  doc.fontSize(8).text(`Generated on ${new Date().toLocaleString()}`, startX, doc.page.height - 30);

  doc.end();
};

export const exportAttendanceExcel = async (res, meta, rows) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Attendance Report");

  sheet.mergeCells("A1:I1");
  sheet.getCell("A1").value = `Attendance Report — Class ${meta.class}-${meta.section}, ${meta.monthName} ${meta.year}`;
  sheet.getCell("A1").font = { bold: true, size: 13 };

  sheet.mergeCells("A2:I2");
  sheet.getCell("A2").value = `Working Days in Month: ${meta.workingDaysInMonth}`;
  sheet.getCell("A2").font = { italic: true, size: 10 };

  sheet.addRow([]);

  [12, 25, 10, 10, 10, 10, 10, 14, 14].forEach((w, i) => (sheet.getColumn(i + 1).width = w));

  const headerRow = sheet.addRow([
    "Roll No", "Student Name", "Present", "Absent", "Leave", "Holiday", "Sunday", "Working Days", "Attendance %",
  ]);
  headerRow.font = { bold: true };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } };

  rows.forEach((row) => {
    sheet.addRow([
      row.rollNumber, row.name, row.present, row.absent, row.leave,
      row.holidayCount, row.sundayCount, row.workingDays, `${row.percentage}%`,
    ]);
  });

  sheet.addRow([]);
  sheet.addRow([`Generated on ${new Date().toLocaleString()}`]);

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename=attendance-${meta.class}-${meta.section}-${meta.month}-${meta.year}.xlsx`);

  await workbook.xlsx.write(res);
  res.end();
};