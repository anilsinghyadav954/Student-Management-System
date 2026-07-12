import { useState } from "react";
import { toast } from "react-toastify";
import { FiSearch, FiDownload, FiFileText, FiMessageCircle, FiClipboard } from "react-icons/fi";
import { marksService } from "../../../services/marksService";
import { downloadBlob } from "../../../utils/download";
import Loader from "../../../components/ui/Loader.jsx";
import Tabs from "../../../components/ui/Tabs.jsx";
import Badge from "../../../components/ui/Badge.jsx";

const EXAM_TYPES = ["Unit Test", "Mid Term", "Final Term", "Quiz", "Assignment"];

const ResultExport = () => {
  const [filters, setFilters] = useState({
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    class: "",
    section: "",
    subject: "",
    examType: "Unit Test",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(null); // "pdf" | "excel" | "whatsapp" | null

  const handleChange = (field, value) => setFilters((f) => ({ ...f, [field]: value }));

  const handleLoad = async () => {
    const { class: className, section, subject, examType, academicYear } = filters;
    if (!className.trim() || !section.trim() || !subject.trim() || !examType || !academicYear.trim()) {
      toast.warn("Please fill in Class, Section, Subject, and Exam Name");
      return;
    }
    setLoading(true);
    try {
      const { data } = await marksService.getExportData(filters);
      setResult(data.data);
      if (data.data.rows.length === 0) {
        toast.warn("No active students found for that class/section");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting("pdf");
    try {
      const response = await marksService.exportPDF(filters);
      downloadBlob(response, `result-${filters.class}-${filters.section}-${filters.subject}.pdf`);
      toast.success("PDF downloaded");
      return true;
    } catch (error) {
      toast.error("PDF export failed");
      return false;
    } finally {
      setExporting(null);
    }
  };

  const handleExportExcel = async () => {
    setExporting("excel");
    try {
      const response = await marksService.exportExcel(filters);
      downloadBlob(response, `result-${filters.class}-${filters.section}-${filters.subject}.xlsx`);
      toast.success("Excel file downloaded");
    } catch (error) {
      toast.error("Excel export failed");
    } finally {
      setExporting(null);
    }
  };

  /**
   * Browsers cannot programmatically attach a downloaded file to WhatsApp
   * Web for security reasons — there's no API that lets a website hand a
   * file directly to another site/app. The practical, honest workaround
   * (and the one requested): download the PDF first, then open WhatsApp
   * Web with a pre-filled message. The admin attaches the already-downloaded
   * PDF themselves in WhatsApp — one extra click, but it's the most that's
   * actually possible from a web page.
   */
  const handleShareWhatsApp = async () => {
    setExporting("whatsapp");
    const downloaded = await handleExportPDF();
    setExporting(null);
    if (!downloaded) return;

    const message = `Test Result of Class ${filters.class}-${filters.section} (${filters.subject}, ${filters.examType}) is attached.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    toast.info("PDF downloaded — attach it manually in the WhatsApp chat that just opened.");
  };

  /**
   * Builds a plain-text, WhatsApp-ready summary of the currently loaded
   * results and copies it to the clipboard. Uses the modern Clipboard API
   * where available, falling back to the older execCommand approach for
   * browsers/contexts (e.g. non-HTTPS) where navigator.clipboard isn't
   * exposed.
   */
  const handleCopySummary = async () => {
    if (!result || result.rows.length === 0) {
      toast.warn("Load results first before copying a summary");
      return;
    }

    const total = result.rows.length;
    const absent = result.rows.filter((r) => r.isAbsent).length;
    const present = total - absent;

    const lines = [
      `Class: ${result.meta.class}-${result.meta.section}`,
      `Subject: ${result.meta.subject}`,
      `Exam: ${result.meta.examType}`,
      "",
      ...result.rows.map((row, i) => {
        const score = row.isAbsent ? "Absent" : `${row.marksObtained}/${row.totalMarks}`;
        return `${i + 1}. ${row.name} - ${score}`;
      }),
      "",
      `Total Students: ${total}`,
      `Present: ${present}`,
      `Absent: ${absent}`,
    ];
    const summaryText = lines.join("\n");

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(summaryText);
      } else {
        // Fallback for browsers/contexts without the Clipboard API
        const textarea = document.createElement("textarea");
        textarea.value = summaryText;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      toast.success("Result summary copied! Paste it directly into WhatsApp.");
    } catch (error) {
      toast.error("Couldn't copy automatically — your browser may be blocking clipboard access.");
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Marks Management</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Export class results as PDF/Excel or share on WhatsApp</p>
      </div>

      <Tabs
        tabs={[
          { to: "/admin/marks", label: "Individual Entry", end: true },
          { to: "/admin/marks/bulk", label: "Bulk Entry" },
          { to: "/admin/marks/export", label: "Export Results" },
        ]}
      />

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Academic Session</label>
            <input value={filters.academicYear} onChange={(e) => handleChange("academicYear", e.target.value)} className="input-field" placeholder="2025-2026" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Class</label>
            <input value={filters.class} onChange={(e) => handleChange("class", e.target.value)} className="input-field" placeholder="e.g. 10" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Section</label>
            <input value={filters.section} onChange={(e) => handleChange("section", e.target.value)} className="input-field" placeholder="e.g. A" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Subject</label>
            <input value={filters.subject} onChange={(e) => handleChange("subject", e.target.value)} className="input-field" placeholder="e.g. Mathematics" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Exam Name</label>
            <select value={filters.examType} onChange={(e) => handleChange("examType", e.target.value)} className="input-field">
              {EXAM_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        <button onClick={handleLoad} disabled={loading} className="btn-primary mt-3">
          <FiSearch /> {loading ? "Loading..." : "Load Results"}
        </button>
      </div>

      {loading && <Loader />}

      {!loading && result && (
        <div className="card overflow-hidden !p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {result.rows.length} student(s) — Class {result.meta.class}-{result.meta.section}, {result.meta.subject} ({result.meta.examType})
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleExportPDF} disabled={!!exporting} className="btn-secondary text-xs">
                <FiFileText size={14} /> {exporting === "pdf" ? "Exporting..." : "Export PDF"}
              </button>
              <button onClick={handleExportExcel} disabled={!!exporting} className="btn-secondary text-xs">
                <FiDownload size={14} /> {exporting === "excel" ? "Exporting..." : "Export Excel"}
              </button>
              <button onClick={handleCopySummary} className="btn-secondary text-xs">
                <FiClipboard size={14} /> Copy Result Summary
              </button>
              <button onClick={handleShareWhatsApp} disabled={!!exporting} className="btn-primary text-xs !bg-green-600 hover:!bg-green-700">
                <FiMessageCircle size={14} /> {exporting === "whatsapp" ? "Preparing..." : "Share on WhatsApp"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Roll No</th>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Father Name</th>
                  <th className="px-4 py-3">Marks</th>
                  <th className="px-4 py-3">Percentage</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {result.rows.map((row) => (
                  <tr key={row.studentDbId}>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{row.rollNumber}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{row.name}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{row.fatherName}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                      {row.isAbsent ? "—" : `${row.marksObtained}/${row.totalMarks}`}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{row.isAbsent ? "—" : `${row.percentage}%`}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-200">{row.isAbsent ? "—" : row.grade}</td>
                    <td className="px-4 py-2.5">
                      <Badge status={row.isAbsent ? "absent" : row.grade === "F" ? "absent" : "present"}>
                        {row.isAbsent ? "Absent" : row.grade === "F" ? "Fail" : "Pass"}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {result.rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                      No students found for this class/section.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultExport;