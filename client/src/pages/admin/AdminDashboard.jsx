import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import { FiUsers, FiUserCheck, FiCheckCircle, FiActivity } from "react-icons/fi";
import { dashboardService } from "../../services/dashboardService";
import StatCard from "../../components/ui/StatCard.jsx";
import Loader from "../../components/ui/Loader.jsx";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend);

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await dashboardService.getStats();
        setStats(data.data);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load dashboard stats");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <Loader fullScreen />;
  if (!stats) return null;

  const { totals, attendanceToday, gradeDistribution, weeklyTrend, recentActivities } = stats;

  const trendData = {
    labels: weeklyTrend.map((d) =>
      new Date(d.date).toLocaleDateString(undefined, { weekday: "short" })
    ),
    datasets: [
      {
        label: "Students present",
        data: weeklyTrend.map((d) => d.present),
        borderColor: "#4f46e5",
        backgroundColor: "rgba(79, 70, 229, 0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const gradeData = {
    labels: gradeDistribution.map((g) => g.grade),
    datasets: [
      {
        label: "Students",
        data: gradeDistribution.map((g) => g.count),
        backgroundColor: "#818cf8",
        borderRadius: 6,
      },
    ],
  };

  const attendanceDonut = {
    labels: ["Present", "Absent", "Late", "Half-day"],
    datasets: [
      {
        data: [attendanceToday.present, attendanceToday.absent, attendanceToday.late, attendanceToday.halfDay],
        backgroundColor: ["#22c55e", "#ef4444", "#f59e0b", "#a3a3a3"],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Overview of your school's activity</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Students" value={totals.totalStudents} icon={FiUsers} color="primary" />
        <StatCard label="Active Students" value={totals.activeStudents} icon={FiUserCheck} color="green" />
        <StatCard label="Attendance Today" value={attendanceToday.percentage} suffix="%" icon={FiCheckCircle} color="amber" />
        <StatCard label="Marked Today" value={attendanceToday.totalMarked} icon={FiActivity} color="red" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Attendance Trend (Last 7 Days)
          </h2>
          <div className="h-64">
            <Line data={trendData} options={chartOptions} />
          </div>
        </div>

        <div className="card">
          <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Today's Attendance</h2>
          <div className="h-64">
            {attendanceToday.totalMarked > 0 ? (
              <Doughnut
                data={attendanceDonut}
                options={{ ...chartOptions, plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } } }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                No attendance marked yet today
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Grade Distribution</h2>
          <div className="h-56">
            <Bar data={gradeData} options={chartOptions} />
          </div>
        </div>

        <div className="card">
          <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Recent Activity</h2>
          <ul className="space-y-3">
            {recentActivities.length === 0 && (
              <p className="text-sm text-slate-400">No recent activity yet.</p>
            )}
            {recentActivities.map((activity, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-500" />
                <div>
                  <p className="text-slate-600 dark:text-slate-300">{activity.message}</p>
                  <p className="text-slate-400">{new Date(activity.timestamp).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
