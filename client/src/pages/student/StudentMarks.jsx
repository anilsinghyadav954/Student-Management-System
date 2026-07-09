import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "react-toastify";
import { marksService } from "../../services/marksService";
import Loader from "../../components/ui/Loader.jsx";

const gradeColor = (grade) => {
  if (["A+", "A"].includes(grade)) return "text-green-600 dark:text-green-400";
  if (["B+", "B"].includes(grade)) return "text-blue-600 dark:text-blue-400";
  if (grade === "C") return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
};

const StudentMarks = () => {
  const { studentProfile } = useOutletContext();
  const [marks, setMarks] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentProfile) return;
    const fetchData = async () => {
      try {
        const { data } = await marksService.getForStudent(studentProfile._id);
        setMarks(data.data);
      } catch (error) {
        toast.error("Failed to load marks");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [studentProfile]);

  if (loading) return <Loader />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">My Marks & Results</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Subject-wise marks across all exams</p>
      </div>

      <div className="card flex items-center gap-6">
        <div className="text-4xl font-bold text-primary-600 dark:text-primary-400">
          {marks?.summary?.overallPercentage ?? 0}%
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          <p>{marks?.summary?.subjectCount ?? 0} subject records</p>
          <p>{marks?.summary?.totalObtained ?? 0} / {marks?.summary?.totalMax ?? 0} total marks</p>
        </div>
      </div>

      <div className="card overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Exam</th>
                <th className="px-4 py-3">Academic Year</th>
                <th className="px-4 py-3">Marks</th>
                <th className="px-4 py-3">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {marks?.records?.map((r) => (
                <tr key={r._id}>
                  <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{r.subject}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{r.examType}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{r.academicYear}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{r.marksObtained}/{r.totalMarks} ({r.percentage}%)</td>
                  <td className={`px-4 py-2.5 font-bold ${gradeColor(r.grade)}`}>{r.grade}</td>
                </tr>
              ))}
              {(!marks?.records || marks.records.length === 0) && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">No marks recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentMarks;
