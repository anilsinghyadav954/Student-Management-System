import { useState, useRef } from "react";
import { toast } from "react-toastify";
import {
  FiUploadCloud, FiDownload, FiCheckCircle, FiXCircle, FiAlertCircle,
  FiFileText, FiRefreshCw, FiUsers,
} from "react-icons/fi";
import { studentService } from "../../../services/studentService";
import { downloadBlob } from "../../../utils/download";
import Loader from "../../../components/ui/Loader.jsx";
import Badge from "../../../components/ui/Badge.jsx";
import Tabs from "../../../components/ui/Tabs.jsx";

const PROGRESS_STEPS = ["Uploading", "Reading Excel", "Validating", "Done"];

const BulkStudentImport = () => {
  const [step, setStep] = useState("upload"); // upload | preview | importing | result
  const [progressStep, setProgressStep] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const [preview, setPreview] = useState(null); // { summary, rows }
  const [duplicateAction, setDuplicateAction] = useState("skip");
  const [importResult, setImportResult] = useState(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [exportingExisting, setExportingExisting] = useState(false);

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const response = await studentService.downloadImportTemplate();
      downloadBlob(response, "student-import-template.xlsx");
      toast.success("Sample template downloaded");
    } catch (error) {
      toast.error("Failed to download template");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleExportExisting = async () => {
    setExportingExisting(true);
    try {
      const response = await studentService.exportAsTemplate();
      downloadBlob(response, "all-students-export.xlsx");
      toast.success("Existing students exported");
    } catch (error) {
      toast.error("Failed to export students");
    } finally {
      setExportingExisting(false);
    }
  };

  const processFile = async (file) => {
    if (!file) return;
    const validExt = /\.(xlsx|xls|csv)$/i.test(file.name);
    if (!validExt) {
      toast.error("Only .xlsx, .xls, or .csv files are allowed");
      return;
    }

    setStep("importing");
    setProgressStep(0);
    const formData = new FormData();
    formData.append("file", file);

    try {
      setProgressStep(1); // Uploading
      await new Promise((r) => setTimeout(r, 300)); // brief visual pause so the step is perceptible
      setProgressStep(2); // Reading Excel
      const { data } = await studentService.previewImport(formData);
      setProgressStep(3); // Validating (done, since backend already validated)
      await new Promise((r) => setTimeout(r, 200));

      setPreview(data.data);
      setStep("preview");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to process file");
      setStep("upload");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files?.[0]);
  };

  const handleImport = async () => {
    const hasDuplicates = preview.summary.duplicate > 0;
    if (hasDuplicates && duplicateAction === "cancel") {
      toast.info("Import cancelled");
      handleReset();
      return;
    }

    setStep("importing");
    setProgressStep(3); // reuse "Validating" visual slot as "Importing"
    try {
      const { data } = await studentService.executeImport({
        rows: preview.rows,
        duplicateAction: hasDuplicates ? duplicateAction : "skip",
      });
      setImportResult(data.data);
      setStep("result");
    } catch (error) {
      toast.error(error.response?.data?.message || "Import failed");
      setStep("preview");
    }
  };

  const handleDownloadCredentials = async () => {
    if (!importResult?.credentials?.length) return;
    try {
      const response = await studentService.downloadCredentialsExcel(importResult.credentials);
      downloadBlob(response, "student-login-credentials.xlsx");
      toast.success("Credentials downloaded");
    } catch (error) {
      toast.error("Failed to download credentials");
    }
  };

  const handleDownloadErrorReport = () => {
    const failedRows = preview?.rows?.filter((r) => r.status === "invalid") || [];
    if (failedRows.length === 0) {
      toast.info("No error rows to report");
      return;
    }
    const csvLines = ["Row Number,Admission Number,Student Name,Errors"];
    failedRows.forEach((r) => {
      const errors = r.errors.join("; ").replace(/,/g, ";");
      csvLines.push(`${r.rowNumber},"${r.data.admissionNumber || ""}","${r.data.name || ""}","${errors}"`);
    });
    const blob = new Blob([csvLines.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "import-error-report.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setStep("upload");
    setPreview(null);
    setImportResult(null);
    setProgressStep(0);
    setDuplicateAction("skip");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const statusBadge = (status) => {
    if (status === "valid") return <Badge status="active">Valid</Badge>;
    if (status === "invalid") return <Badge status="suspended">Invalid</Badge>;
    return <Badge status="inactive">Duplicate</Badge>;
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Students</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Import hundreds of students at once from an Excel/CSV file</p>
      </div>

      <Tabs
        tabs={[
          { to: "/admin/students", label: "Student List", end: true },
          { to: "/admin/students/bulk-import", label: "Bulk Student Import" },
          { to: "/admin/students/promote", label: "Promote Students" },
        ]}
      />

      {/* Step 1: Upload */}
      {step === "upload" && (
        <>
          <div className="card">
            <div className="flex flex-wrap gap-3">
              <button onClick={handleDownloadTemplate} disabled={downloadingTemplate} className="btn-secondary">
                <FiDownload /> {downloadingTemplate ? "Preparing..." : "Download Sample Excel"}
              </button>
              <button onClick={handleExportExisting} disabled={exportingExisting} className="btn-secondary">
                <FiFileText /> {exportingExisting ? "Preparing..." : "Export Existing Students"}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              The sample file has all required column headers pre-filled with one example row — just add your data below it and re-upload.
            </p>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`card flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed py-16 text-center transition-colors
              ${dragOver ? "border-primary-500 bg-primary-50 dark:bg-primary-900/10" : "border-slate-300 dark:border-slate-600"}`}
          >
            <FiUploadCloud className="text-4xl text-primary-500" />
            <p className="font-medium text-slate-700 dark:text-slate-200">Drag & drop your Excel/CSV file here</p>
            <p className="text-sm text-slate-400">or click to browse — .xlsx, .xls, .csv supported</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => processFile(e.target.files?.[0])}
            />
          </div>
        </>
      )}

      {/* Progress */}
      {step === "importing" && (
        <div className="card py-10">
          <div className="mx-auto max-w-md">
            <div className="mb-4 flex justify-between text-xs text-slate-500 dark:text-slate-400">
              {PROGRESS_STEPS.map((label, i) => (
                <span key={label} className={i < progressStep ? "font-semibold text-primary-600 dark:text-primary-400" : ""}>
                  {label}
                </span>
              ))}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-primary-600 transition-all duration-500"
                style={{ width: `${(progressStep / PROGRESS_STEPS.length) * 100}%` }}
              />
            </div>
            <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">Please wait, this may take a moment for large files...</p>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === "preview" && preview && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="card text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{preview.summary.total}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Students</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{preview.summary.valid}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Valid Records</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{preview.summary.invalid}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Invalid Records</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{preview.summary.duplicate}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Duplicate Records</p>
            </div>
          </div>

          {preview.summary.duplicate > 0 && (
            <div className="card border-2 border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/10">
              <div className="flex items-start gap-3">
                <FiAlertCircle className="mt-0.5 flex-shrink-0 text-xl text-amber-500" />
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-700 dark:text-amber-400">
                    {preview.summary.duplicate} student(s) already exist
                  </h3>
                  <p className="mt-1 text-sm text-amber-600 dark:text-amber-300">Choose how to handle them:</p>
                  <div className="mt-2 flex flex-wrap gap-4">
                    {[
                      { value: "skip", label: "Skip Duplicates" },
                      { value: "update", label: "Update Existing Students" },
                      { value: "cancel", label: "Cancel Import" },
                    ].map((opt) => (
                      <label key={opt.value} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                        <input
                          type="radio"
                          name="duplicateAction"
                          checked={duplicateAction === opt.value}
                          onChange={() => setDuplicateAction(opt.value)}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="card overflow-hidden !p-0">
            <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Preview — every row exactly as it will be imported</h3>
              {preview.summary.invalid > 0 && (
                <button onClick={handleDownloadErrorReport} className="btn-secondary text-xs">
                  <FiDownload size={14} /> Download Error Report
                </button>
              )}
            </div>
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Row</th>
                    <th className="px-4 py-3">Admission No</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Class/Section</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {preview.rows.map((row) => (
                    <tr key={row.rowNumber} className={row.status === "invalid" ? "bg-red-50/50 dark:bg-red-900/5" : ""}>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{row.rowNumber}</td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{row.data.admissionNumber}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{row.data.name}</td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{row.data.class}-{row.data.section}</td>
                      <td className="px-4 py-2.5">{statusBadge(row.status)}</td>
                      <td className="px-4 py-2.5 text-xs text-red-500">
                        {row.errors.map((err, i) => <div key={i}>{err}</div>)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button onClick={handleReset} className="btn-secondary">Cancel</button>
            <button
              onClick={handleImport}
              disabled={preview.summary.valid === 0 && preview.summary.duplicate === 0}
              className="btn-primary"
            >
              <FiUsers /> Import Students
            </button>
          </div>
        </>
      )}

      {/* Step 3: Result */}
      {step === "result" && importResult && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="card text-center">
              <FiCheckCircle className="mx-auto mb-1 text-xl text-green-500" />
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{importResult.imported}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Imported</p>
            </div>
            <div className="card text-center">
              <FiRefreshCw className="mx-auto mb-1 text-xl text-blue-500" />
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{importResult.updated}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Updated</p>
            </div>
            <div className="card text-center">
              <FiAlertCircle className="mx-auto mb-1 text-xl text-amber-500" />
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{importResult.skipped}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Skipped</p>
            </div>
            <div className="card text-center">
              <FiXCircle className="mx-auto mb-1 text-xl text-red-500" />
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{importResult.failed}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Failed</p>
            </div>
          </div>

          {importResult.credentials?.length > 0 && (
            <div className="card border-2 border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-900/10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-green-700 dark:text-green-400">{importResult.credentials.length} new login accounts created</h3>
                  <p className="text-sm text-green-600 dark:text-green-300">Download and securely share these with students/parents.</p>
                </div>
                <button onClick={handleDownloadCredentials} className="btn-primary">
                  <FiDownload /> Download Login Credentials
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={handleReset} className="btn-secondary">
              <FiUploadCloud /> Import Another File
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default BulkStudentImport;