import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "react-toastify";
import { attendanceService } from "../../services/attendanceService";
import Loader from "../../components/ui/Loader.jsx";
import Badge from "../../components/ui/Badge.jsx";

const StudentAttendance = () => {
  const { studentProfile } = useOutletContext();
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);

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
        <p className="text-sm text-slate-500 dark:text-slate-400">Your full attendance history</p>
      </div>

      <div className="card flex items-center gap-6">
        <div className={`text-4xl font-bold ${percentColor(attendance?.percentage ?? 0)}`}>
          {attendance?.percentage ?? 0}%
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          <p>{attendance?.totalDaysMarked ?? 0} total days marked</p>
          <p className="text-xs">A percentage below 75% may affect eligibility for exams.</p>
        </div>
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
