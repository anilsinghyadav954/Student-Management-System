import { useState } from "react";
import { toast } from "react-toastify";
import { FiSearch, FiArrowUpRight, FiCheckCircle } from "react-icons/fi";
import { promotionService } from "../../../services/promotionService";
import Loader from "../../../components/ui/Loader.jsx";
import Badge from "../../../components/ui/Badge.jsx";
import ConfirmDialog from "../../../components/ui/ConfirmDialog.jsx";
import Tabs from "../../../components/ui/Tabs.jsx";

const PromoteStudents = () => {
  const [form, setForm] = useState({
    fromClass: "",
    fromSection: "",
    toClass: "",
    toSection: "",
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  });

  const [candidates, setCandidates] = useState(null); // [{ studentDbId, studentId, rollNumber, name, overallPercentage, suggestedResult }]
  const [results, setResults] = useState({}); // studentDbId -> "promoted" | "retained"
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [summary, setSummary] = useState(null);

  const handleChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleLoad = async () => {
    if (!form.fromClass.trim() || !form.fromSection.trim()) {
      toast.warn("From Class and From Section are required");
      return;
    }
    setLoading(true);
    setSummary(null);
    try {
      const { data } = await promotionService.getCandidates({ class: form.fromClass, section: form.fromSection });
      setCandidates(data.data);
      const initialResults = {};
      data.data.forEach((c) => { initialResults[c.studentDbId] = c.suggestedResult; });
      setResults(initialResults);
      if (data.data.length === 0) toast.warn("No active students found in this class/section");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const toggleResult = (studentDbId) => {
    setResults((prev) => ({
      ...prev,
      [studentDbId]: prev[studentDbId] === "promoted" ? "retained" : "promoted",
    }));
  };

  const promotedCount = Object.values(results).filter((r) => r === "promoted").length;
  const retainedCount = Object.values(results).filter((r) => r === "retained").length;

  const handleConfirmPromote = async () => {
    if (!form.toClass.trim() || !form.toSection.trim()) {
      toast.warn("To Class and To Section are required");
      setConfirmOpen(false);
      return;
    }
    setPromoting(true);
    try {
      const { data } = await promotionService.execute({
        fromClass: form.fromClass,
        fromSection: form.fromSection,
        toClass: form.toClass,
        toSection: form.toSection,
        academicYear: form.academicYear,
        promotions: candidates.map((c) => ({ student: c.studentDbId, result: results[c.studentDbId] })),
      });
      setSummary(data.data);
      setConfirmOpen(false);
      toast.success("Promotion completed");
      setCandidates(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Promotion failed");
    } finally {
      setPromoting(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Students</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Promote an entire class to the next class/section in one action</p>
      </div>

      <Tabs
        tabs={[
          { to: "/admin/students", label: "Student List", end: true },
          { to: "/admin/students/bulk-import", label: "Bulk Student Import" },
          { to: "/admin/students/promote", label: "Promote Students" },
        ]}
      />

      <div className="card">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">From Class</label>
            <input value={form.fromClass} onChange={(e) => handleChange("fromClass", e.target.value)} className="input-field" placeholder="e.g. 10" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">From Section</label>
            <input value={form.fromSection} onChange={(e) => handleChange("fromSection", e.target.value)} className="input-field" placeholder="e.g. A" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">To Class</label>
            <input value={form.toClass} onChange={(e) => handleChange("toClass", e.target.value)} className="input-field" placeholder="e.g. 11" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">To Section</label>
            <input value={form.toSection} onChange={(e) => handleChange("toSection", e.target.value)} className="input-field" placeholder="e.g. A" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Academic Year</label>
            <input value={form.academicYear} onChange={(e) => handleChange("academicYear", e.target.value)} className="input-field" />
          </div>
        </div>
        <button onClick={handleLoad} className="btn-primary mt-3">
          <FiSearch /> Load Students
        </button>
      </div>

      {loading && <Loader />}

      {summary && (
        <div className="card border-2 border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-900/10">
          <div className="flex items-center gap-3">
            <FiCheckCircle className="text-2xl text-green-500" />
            <p className="text-sm text-green-700 dark:text-green-400">
              <span className="font-semibold">{summary.promotedCount}</span> student(s) promoted to {form.toClass}-{form.toSection},{" "}
              <span className="font-semibold">{summary.retainedCount}</span> retained in {form.fromClass}-{form.fromSection}.
            </p>
          </div>
        </div>
      )}

      {!loading && candidates && candidates.length > 0 && (
        <>
          <div className="card overflow-hidden !p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-700">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {candidates.length} student(s) — <span className="font-semibold text-green-600 dark:text-green-400">{promotedCount} to promote</span>,{" "}
                <span className="font-semibold text-amber-600 dark:text-amber-400">{retainedCount} to retain</span>
              </p>
              <p className="text-xs text-slate-400">Click a status badge to override the suggestion</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Roll No</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Overall %</th>
                    <th className="px-4 py-3">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {candidates.map((c) => (
                    <tr key={c.studentDbId}>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{c.rollNumber}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{c.name}</td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                        {c.overallPercentage !== null ? `${c.overallPercentage}%` : "No marks on file"}
                      </td>
                      <td className="px-4 py-2.5">
                        <button type="button" onClick={() => toggleResult(c.studentDbId)}>
                          <Badge status={results[c.studentDbId] === "promoted" ? "active" : "suspended"}>
                            {results[c.studentDbId] === "promoted" ? "Promote" : "Retain"}
                          </Badge>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={() => setConfirmOpen(true)} className="btn-primary">
              <FiArrowUpRight /> Promote Students
            </button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        danger={false}
        title="Confirm class promotion"
        message={`${promotedCount} student(s) will move to ${form.toClass || "?"}-${form.toSection || "?"}. ${retainedCount} student(s) will remain in ${form.fromClass}-${form.fromSection}. This action is logged in promotion history and cannot be automatically undone.`}
        confirmLabel="Confirm & Promote"
        loading={promoting}
        onConfirm={handleConfirmPromote}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};

export default PromoteStudents;