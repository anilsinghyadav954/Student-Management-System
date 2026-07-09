import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { FiArrowLeft, FiMail, FiPhone, FiUser } from "react-icons/fi";
import { studentService } from "../../../services/studentService";
import { attendanceService } from "../../../services/attendanceService";
import { marksService } from "../../../services/marksService";
import Badge from "../../../components/ui/Badge.jsx";
import Loader from "../../../components/ui/Loader.jsx";

const StudentView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [marks, setMarks] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [studentRes, attendanceRes, marksRes] = await Promise.all([
          studentService.getById(id),
          attendanceService.getStudentAttendance(id),
          marksService.getForStudent(id),
        ]);
        setStudent(studentRes.data.data);
        setAttendance(attendanceRes.data.data);
        setMarks(marksRes.data.data);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load student details");
        navigate("/admin/students");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id, navigate]);

  if (loading) return <Loader fullScreen />;
  if (!student) return null;

  return (
    <div className="space-y-5 animate-fade-in">
      <Link to="/admin/students" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400">
        <FiArrowLeft /> Back to Students
      </Link>

      <div className="card flex flex-col gap-4 sm:flex-row sm:items-center">
        {student.profile?.profileImage?.url ? (
          <img src={student.profile.profileImage.url} alt="" className="h-20 w-20 rounded-2xl object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-100 text-2xl font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-400">
            {student.profile?.name?.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">{student.profile?.name}</h1>
            <Badge status={student.status}>{student.status}</Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {student.studentId} · {student.class} - {student.section} · Roll No. {student.rollNumber}
          </p>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1"><FiMail size={13} /> {student.profile?.email}</span>
            {student.profile?.phone && <span className="flex items-center gap-1"><FiPhone size={13} /> {student.profile.phone}</span>}
            <span className="flex items-center gap-1"><FiUser size={13} /> Guardian: {student.guardian?.name} ({student.guardian?.phone})</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Attendance Summary</h2>
          <div className="flex items-center gap-6">
            <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">{attendance?.percentage}%</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <p>{attendance?.totalDaysMarked} days marked</p>
              <p>Based on all recorded attendance</p>
            </div>
          </div>
          <div className="mt-4 max-h-48 space-y-1.5 overflow-y-auto pr-1">
            {attendance?.history?.slice(0, 10).map((record) => (
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
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Marks Summary</h2>
          <div className="flex items-center gap-6">
            <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
              {marks?.summary?.overallPercentage}%
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <p>{marks?.summary?.subjectCount} subject records</p>
              <p>{marks?.summary?.totalObtained} / {marks?.summary?.totalMax} total marks</p>
            </div>
          </div>
          <div className="mt-4 max-h-48 space-y-1.5 overflow-y-auto pr-1">
            {marks?.records?.map((record) => (
              <div key={record._id} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300">{record.subject} ({record.examType})</span>
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {record.marksObtained}/{record.totalMarks} — {record.grade}
                </span>
              </div>
            ))}
            {(!marks?.records || marks.records.length === 0) && (
              <p className="text-xs text-slate-400">No marks recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentView;
