import api from "./api";

export const attendanceService = {
  getGrid: (params) => api.get("/attendance", { params }),
  mark: (payload) => api.post("/attendance/mark", payload),
  update: (id, payload) => api.put(`/attendance/${id}`, payload),
  getMonthlyReport: (params) => api.get("/attendance/monthly-report", { params }),
  getStudentAttendance: (studentId) => api.get(`/attendance/student/${studentId}`),
  getCalendar: (studentId, params) => api.get(`/attendance/calendar/${studentId}`, { params }),
  exportPDF: (params) => api.get("/attendance/export/pdf", { params, responseType: "blob" }),
  exportExcel: (params) => api.get("/attendance/export/excel", { params, responseType: "blob" }),
};