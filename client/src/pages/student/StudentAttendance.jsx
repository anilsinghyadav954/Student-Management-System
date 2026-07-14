import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "react-toastify";
import { attendanceService } from "../../services/attendanceService";
import Loader from "../../components/ui/Loader.jsx";
import Badge from "../../components/ui/Badge.jsx";
import AttendanceCalendar from "../../components/attendance/AttendanceCalendar.jsx";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const StudentAttendance = () => {
  const { studentProfile } = useOutletContext();
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [calendarDays, setCalendarDays] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(true);

  useEffect(() => {
    if (!studentProfile) return;
    const fetchData = async () => {
      try {
        const { data } = await attendanceService.getStudentAttendance(studentProfile._id);
        setAttendance(data.data);
      } catch (error) {
        toast.error("Failed to load attendance");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [studentProfile]);

  useEffect(() => {
    if (!studentProfile) return;
    const fetchCalendar = async () => {
      setCalendarLoading(true);
      try {
        const { data } = await attendanceService.getCalendar(studentProfile._id, { month, year });
        setCalendarDays(data.data.days);
      } catch (error) {
        toast.error("Failed to load calendar");
      } finally {
        setCalendarLoading(false);
      }
    };
    fetchCalendar();
  }, [studentProfile, month, year]);

  if (loading) return <Loader />;

  const percentColor = (pct) => {
    if (pct >= 90) return "text-green-600 dark:text-green-400";
    if (pct >= 75) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">My Attendance</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Your full attendance history, calculated on Working Days only</p>
      </div>

      <div className="card flex items-center gap-6">
        <div className={`text-4xl font-bold ${percentColor(attendance?.percentage ?? 0)}`}>
          {attendance?.percentage ?? 0}%
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          <p>{attendance?.totalDaysMarked ?? 0} working days marked</p>
          <p className="text-xs">Sundays and holidays are excluded from this percentage. Below 75% may affect exam eligibility.</p>
        </div>
      </div>

      <div className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Attendance Calendar</h2>
          <div className="flex gap-2">
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="input-field py-1.5 text-xs">
              {months.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="input-field w-24 py-1.5 text-xs" />
          </div>
        </div>
        {calendarLoading ? <Loader /> : <AttendanceCalendar days={calendarDays} />}
      </div>

      <div className="card overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {attendance?.history?.map((record) => (
                <tr key={record._id}>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    {new Date(record.date).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                  </td>
                  <td className="px-4 py-2.5"><Badge status={record.status}>{record.status}</Badge></td>
                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{record.remarks || "—"}</td>
                </tr>
              ))}
              {(!attendance?.history || attendance.history.length === 0) && (
                <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-slate-400">No attendance records yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentAttendance;