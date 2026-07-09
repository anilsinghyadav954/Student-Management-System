import asyncHandler from "express-async-handler";
import Student from "../models/Student.js";
import Attendance from "../models/Attendance.js";
import Marks from "../models/Marks.js";
import Notice from "../models/Notice.js";
import { sendResponse } from "../utils/apiResponse.js";

/**
 * @desc   Aggregate stats for the admin dashboard: totals, today's
 *         attendance breakdown, marks distribution, and recent activity.
 * @route  GET /api/dashboard/stats
 * @access Private/Admin
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const [totalStudents, activeStudents, todayAttendance, allGrades, recentStudents, recentNotices] =
    await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ status: "active" }),
      Attendance.find({ date: todayStart }),
      Marks.find().select("grade"),
      Student.find().populate("profile", "name").sort({ createdAt: -1 }).limit(5),
      Notice.find().sort({ createdAt: -1 }).limit(5).select("title createdAt priority"),
    ]);

  // Today's attendance breakdown (for a pie/donut chart)
  const attendanceBreakdown = {
    present: todayAttendance.filter((a) => a.status === "present").length,
    absent: todayAttendance.filter((a) => a.status === "absent").length,
    late: todayAttendance.filter((a) => a.status === "late").length,
    halfDay: todayAttendance.filter((a) => a.status === "half-day").length,
  };
  const totalMarkedToday = todayAttendance.length;
  const attendancePercentageToday =
    totalMarkedToday > 0
      ? Number(
          (((attendanceBreakdown.present + attendanceBreakdown.late + attendanceBreakdown.halfDay * 0.5) /
            totalMarkedToday) *
            100
          ).toFixed(1)
        )
      : 0;

  // Grade distribution across all marks records (for a bar chart)
  const gradeDistribution = ["A+", "A", "B+", "B", "C", "D", "F"].map((grade) => ({
    grade,
    count: allGrades.filter((m) => m.grade === grade).length,
  }));

  // Last 7 days attendance trend (for a line chart)
  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const weekRecords = await Attendance.find({ date: { $gte: sevenDaysAgo, $lte: todayStart } });

  const weeklyTrend = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(sevenDaysAgo);
    day.setDate(day.getDate() + i);
    const dayRecords = weekRecords.filter((r) => r.date.getTime() === day.getTime());
    const present = dayRecords.filter((r) => r.status === "present" || r.status === "late").length;
    weeklyTrend.push({
      date: day.toISOString().split("T")[0],
      present,
      total: dayRecords.length,
    });
  }

  const recentActivities = [
    ...recentStudents.map((s) => ({
      type: "student_added",
      message: `${s.profile?.name || "A student"} was added (${s.studentId})`,
      timestamp: s.createdAt,
    })),
    ...recentNotices.map((n) => ({
      type: "notice_posted",
      message: `Notice posted: "${n.title}"`,
      timestamp: n.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 8);

  sendResponse(res, 200, "Dashboard stats fetched successfully", {
    totals: {
      totalStudents,
      activeStudents,
      inactiveStudents: totalStudents - activeStudents,
    },
    attendanceToday: {
      ...attendanceBreakdown,
      totalMarked: totalMarkedToday,
      percentage: attendancePercentageToday,
    },
    gradeDistribution,
    weeklyTrend,
    recentActivities,
  });
});
