import { useState } from "react";
import { toast } from "react-toastify";
import { FiSearch } from "react-icons/fi";
import { attendanceService } from "../../../services/attendanceService";
import Loader from "../../../components/ui/Loader.jsx";
import Tabs from "../../../components/ui/Tabs.jsx";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const AttendanceReport = () => {
  const now = new Date();
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    if (!className.trim() || !section.trim()) {
      toast.warn("Class and section are required");
      return;
    }
    setLoading(true);
    try {
      const { data } = await attendanceService.getMonthlyReport({ class: className, section, month, year });
      setReport(data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const percentColor = (pct) => {
    if (pct >= 90) return "text-green-600 dark:text-green-400";
    if (pct >= 75) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Monthly Attendance Report</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Per-student attendance percentage for a given month</p>
      </div>

      <Tabs
        tabs={[
          { to: "/admin/attendance", label: "Mark Attendance", end: true },
          { to: "/admin/attendance/report", label: "Monthly Report" },
        ]}
      />

      <div className="card">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          <input placeholder="Class" value={className} onChange={(e) => setClassName(e.target.value)} className="input-field" />
          <input placeholder="Section" value={section} onChange={(e) => setSection(e.target.value)} className="input-field" />
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="input-field">
            {months.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="input-field" />
          <button onClick={loadReport} className="btn-primary">
            <FiSearch /> Generate
          </button>
        </div>
      </div>

      {loading && <Loader />}

      {!loading && report && (
        <div className="card overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Present</th>
                  <th className="px-4 py-3">Absent</th>
                  <th className="px-4 py-3">Late</th>
                  <th className="px-4 py-3">Half-day</th>
                  <th className="px-4 py-3">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {report.map((row) => (
                  <tr key={row.student.id}>
                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">
                      {row.student.name} <span className="text-xs font-normal text-slate-400">({row.student.studentId})</span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{row.present}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{row.absent}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{row.late}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{row.halfDay}</td>
                    <td className={`px-4 py-2.5 font-semibold ${percentColor(row.percentage)}`}>{row.percentage}%</td>
                  </tr>
                ))}
                {report.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">No students found for this class/section.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceReport;
