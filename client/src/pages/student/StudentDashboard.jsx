import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "react-toastify";
import { FiCheckCircle, FiBookOpen, FiBell, FiAward } from "react-icons/fi";
import { attendanceService } from "../../services/attendanceService";
import { marksService } from "../../services/marksService";
import { noticeService } from "../../services/noticeService";
import { useAuth } from "../../context/AuthContext.jsx";
import StatCard from "../../components/ui/StatCard.jsx";
import Loader from "../../components/ui/Loader.jsx";
import Badge from "../../components/ui/Badge.jsx";

const StudentDashboard = () => {
  const { user } = useAuth();
  const { studentProfile } = useOutletContext();
  const [attendance, setAttendance] = useState(null);
  const [marks, setMarks] = useState(null);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentProfile) return;
    const fetchAll = async () => {
      try {
        const [attendanceRes, marksRes, noticesRes] = await Promise.all([
          attendanceService.getStudentAttendance(studentProfile._id),
          marksService.getForStudent(studentProfile._id),
          noticeService.getMine(),
        ]);
        setAttendance(attendanceRes.data.data);
        setMarks(marksRes.data.data);
        setNotices(noticesRes.data.data.slice(0, 5));
      } catch (error) {
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [studentProfile]);

  if (loading) return <Loader fullScreen={false} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Welcome back, {user?.name?.split(" ")[0]} 👋</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {studentProfile?.studentId} · {studentProfile?.class} - {studentProfile?.section}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Attendance" value={attendance?.percentage ?? 0} suffix="%" icon={FiCheckCircle} color="green" />
        <StatCard label="Overall Marks" value={marks?.summary?.overallPercentage ?? 0} suffix="%" icon={FiAward} color="primary" />
        <StatCard label="Subjects" value={marks?.summary?.subjectCount ?? 0} icon={FiBookOpen} color="amber" />
        <StatCard label="Notices" value={notices.length} icon={FiBell} color="red" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Recent Attendance</h2>
          <div className="space-y-1.5">
            {attendance?.history?.slice(0, 6).map((record) => (
              <div key={record._id} className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">{new Date(record.date).toLocaleDateString()}</span>
                <Badge status={record.status}>{record.status}</Badge>
              </div>
            ))}
            {(!attendance?.history || attendance.history.length === 0) && (
              <p className="text-xs text-slate-400">No attendance records yet.</p>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Latest Notices</h2>
          <div className="space-y-3">
            {notices.map((notice) => (
              <div key={notice._id} className="border-b border-slate-100 pb-2 last:border-0 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{notice.title}</p>
                <p className="text-xs text-slate-400">{new Date(notice.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
            {notices.length === 0 && <p className="text-xs text-slate-400">No notices right now.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
