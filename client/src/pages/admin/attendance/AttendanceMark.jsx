import { useState } from "react";
import { toast } from "react-toastify";
import { FiSave, FiSearch } from "react-icons/fi";
import { attendanceService } from "../../../services/attendanceService";
import Loader from "../../../components/ui/Loader.jsx";
import Badge from "../../../components/ui/Badge.jsx";
import Tabs from "../../../components/ui/Tabs.jsx";

const STATUS_OPTIONS = ["present", "absent", "late", "half-day"];

const todayStr = () => new Date().toISOString().split("T")[0];

const AttendanceMark = () => {
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [date, setDate] = useState(todayStr());

  const [grid, setGrid] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searched, setSearched] = useState(false);

  const loadGrid = async () => {
    if (!className.trim() || !section.trim() || !date) {
      toast.warn("Class, section, and date are required");
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const { data } = await attendanceService.getGrid({ class: className, section, date });
      setGrid(
        data.data.map((row) => ({
          studentId: row.student._id,
          name: row.student.profile?.name,
          rollNumber: row.student.rollNumber,
          status: row.attendance?.status || "present",
          remarks: row.attendance?.remarks || "",
        }))
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load attendance grid");
    } finally {
      setLoading(false);
    }
  };

  const updateRow = (studentId, field, value) => {
    setGrid((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, [field]: value } : r)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await attendanceService.mark({
        date,
        class: className,
        section,
        records: grid.map((r) => ({ student: r.studentId, status: r.status, remarks: r.remarks })),
      });
      toast.success("Attendance saved successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Mark Attendance</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Select a class, section, and date to begin</p>
      </div>

      <Tabs
        tabs={[
          { to: "/admin/attendance", label: "Mark Attendance", end: true },
          { to: "/admin/attendance/report", label: "Monthly Report" },
        ]}
      />

      <div className="card">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input placeholder="Class (e.g. 10)" value={className} onChange={(e) => setClassName(e.target.value)} className="input-field" />
          <input placeholder="Section (e.g. A)" value={section} onChange={(e) => setSection(e.target.value)} className="input-field" />
          <input type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} className="input-field" />
          <button onClick={loadGrid} className="btn-primary">
            <FiSearch /> Load Students
          </button>
        </div>
      </div>

      {loading && <Loader fullScreen={false} />}

      {!loading && searched && grid.length === 0 && (
        <div className="card text-center text-sm text-slate-500 dark:text-slate-400">
          No active students found for that class/section.
        </div>
      )}

      {!loading && grid.length > 0 && (
        <div className="card overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Roll No.</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {grid.map((row) => (
                  <tr key={row.studentId}>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{row.rollNumber}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{row.name}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1.5">
                        {STATUS_OPTIONS.map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => updateRow(row.studentId, "status", status)}
                            className={row.status === status ? "" : "opacity-40 hover:opacity-70"}
                          >
                            <Badge status={status}>{status}</Badge>
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        value={row.remarks}
                        onChange={(e) => updateRow(row.studentId, "remarks", e.target.value)}
                        placeholder="Optional"
                        className="input-field py-1.5 text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end border-t border-slate-200 p-4 dark:border-slate-700">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              <FiSave /> {saving ? "Saving..." : "Save Attendance"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceMark;
