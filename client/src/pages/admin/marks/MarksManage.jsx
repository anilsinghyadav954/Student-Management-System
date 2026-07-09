import { useState } from "react";
import { toast } from "react-toastify";
import { FiSearch, FiPlus, FiTrash2, FiEdit2, FiX, FiCheck } from "react-icons/fi";
import { studentService } from "../../../services/studentService";
import { marksService } from "../../../services/marksService";
import Loader from "../../../components/ui/Loader.jsx";
import ConfirmDialog from "../../../components/ui/ConfirmDialog.jsx";

const EXAM_TYPES = ["Unit Test", "Mid Term", "Final Term", "Quiz", "Assignment"];

const emptyEntry = { subject: "", examType: "Unit Test", academicYear: "", marksObtained: "", totalMarks: "" };

const gradeColor = (grade) => {
  if (["A+", "A"].includes(grade)) return "text-green-600 dark:text-green-400";
  if (["B+", "B"].includes(grade)) return "text-blue-600 dark:text-blue-400";
  if (grade === "C") return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
};

const MarksManage = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [marksData, setMarksData] = useState(null);
  const [loadingMarks, setLoadingMarks] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [entry, setEntry] = useState(emptyEntry);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const { data } = await studentService.getAll({ search: query, limit: 8 });
      setResults(data.data);
    } catch (error) {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const loadMarks = async (student) => {
    setSelectedStudent(student);
    setResults([]);
    setLoadingMarks(true);
    try {
      const { data } = await marksService.getForStudent(student._id);
      setMarksData(data.data);
    } catch (error) {
      toast.error("Failed to load marks");
    } finally {
      setLoadingMarks(false);
    }
  };

  const openAddForm = () => {
    setEntry({ ...emptyEntry, academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}` });
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = (record) => {
    setEntry({
      subject: record.subject,
      examType: record.examType,
      academicYear: record.academicYear,
      marksObtained: record.marksObtained,
      totalMarks: record.totalMarks,
    });
    setEditingId(record._id);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await marksService.update(editingId, {
          marksObtained: Number(entry.marksObtained),
          totalMarks: Number(entry.totalMarks),
        });
        toast.success("Marks updated");
      } else {
        await marksService.add({
          student: selectedStudent._id,
          subject: entry.subject,
          examType: entry.examType,
          academicYear: entry.academicYear,
          marksObtained: Number(entry.marksObtained),
          totalMarks: Number(entry.totalMarks),
        });
        toast.success("Marks added");
      }
      setShowForm(false);
      loadMarks(selectedStudent);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save marks");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await marksService.remove(deleteTarget._id);
      toast.success("Marks record deleted");
      setDeleteTarget(null);
      loadMarks(selectedStudent);
    } catch (error) {
      toast.error("Failed to delete record");
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Marks Management</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Search a student to view or update their marks</p>
      </div>

      <form onSubmit={handleSearch} className="card relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, roll no., or student ID"
              className="input-field pl-10"
            />
          </div>
          <button type="submit" className="btn-primary">{searching ? "..." : "Search"}</button>
        </div>

        {results.length > 0 && (
          <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
            {results.map((s) => (
              <li key={s._id}>
                <button
                  onClick={() => loadMarks(s)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700/40"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-100">{s.profile?.name}</span>
                  <span className="text-xs text-slate-400">{s.studentId} · {s.class}-{s.section}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>

      {loadingMarks && <Loader />}

      {!loadingMarks && selectedStudent && marksData && (
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-700">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">{selectedStudent.profile?.name}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selectedStudent.studentId} · Overall: {marksData.summary.overallPercentage}% ({marksData.summary.totalObtained}/{marksData.summary.totalMax})
              </p>
            </div>
            <button onClick={openAddForm} className="btn-primary text-xs">
              <FiPlus size={14} /> Add Marks
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSave} className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-6 dark:border-slate-700">
              <input required disabled={!!editingId} placeholder="Subject" value={entry.subject} onChange={(e) => setEntry({ ...entry, subject: e.target.value })} className="input-field sm:col-span-2" />
              <select disabled={!!editingId} value={entry.examType} onChange={(e) => setEntry({ ...entry, examType: e.target.value })} className="input-field">
                {EXAM_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
              <input required disabled={!!editingId} placeholder="Academic Year (2025-2026)" value={entry.academicYear} onChange={(e) => setEntry({ ...entry, academicYear: e.target.value })} className="input-field" />
              <input required type="number" min="0" placeholder="Marks obtained" value={entry.marksObtained} onChange={(e) => setEntry({ ...entry, marksObtained: e.target.value })} className="input-field" />
              <input required type="number" min="1" placeholder="Total marks" value={entry.totalMarks} onChange={(e) => setEntry({ ...entry, totalMarks: e.target.value })} className="input-field" />
              <div className="flex gap-2 sm:col-span-6">
                <button type="submit" disabled={saving} className="btn-primary text-xs"><FiCheck size={14} /> {saving ? "Saving..." : "Save"}</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-xs"><FiX size={14} /> Cancel</button>
              </div>
            </form>
          )}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <tr>
                  <th className="py-2">Subject</th>
                  <th className="py-2">Exam</th>
                  <th className="py-2">Year</th>
                  <th className="py-2">Marks</th>
                  <th className="py-2">Grade</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {marksData.records.map((r) => (
                  <tr key={r._id}>
                    <td className="py-2.5 font-medium text-slate-900 dark:text-white">{r.subject}</td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-300">{r.examType}</td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-300">{r.academicYear}</td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-300">{r.marksObtained}/{r.totalMarks}</td>
                    <td className={`py-2.5 font-bold ${gradeColor(r.grade)}`}>{r.grade}</td>
                    <td className="py-2.5">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEditForm(r)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary-600 dark:hover:bg-slate-700"><FiEdit2 size={15} /></button>
                        <button onClick={() => setDeleteTarget(r)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"><FiTrash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {marksData.records.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-sm text-slate-400">No marks recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this marks record?"
        message={`Remove ${deleteTarget?.subject} (${deleteTarget?.examType}) for ${selectedStudent?.profile?.name}?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default MarksManage;
