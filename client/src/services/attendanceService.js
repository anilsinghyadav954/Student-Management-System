import api from "./api";

export const attendanceService = {
  getGrid: (params) => api.get("/attendance", { params }),
  mark: (payload) => api.post("/attendance/mark", payload),
  update: (id, payload) => api.put(`/attendance/${id}`, payload),
  getMonthlyReport: (params) => api.get("/attendance/monthly-report", { params }),
  getStudentAttendance: (studentId) => api.get(`/attendance/student/${studentId}`),
};
