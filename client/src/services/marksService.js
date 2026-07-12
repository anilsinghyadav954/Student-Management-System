import api from "./api";

export const marksService = {
  // ---- Original single-entry marks (untouched) ----
  add: (payload) => api.post("/marks", payload),
  update: (id, payload) => api.put(`/marks/${id}`, payload),
  remove: (id) => api.delete(`/marks/${id}`),
  getForStudent: (studentId, params) => api.get(`/marks/student/${studentId}`, { params }),

  // ---- Bulk Marks Entry (additive) ----
  getBulkGrid: (params) => api.get("/marks/bulk-grid", { params }),
  bulkSave: (payload) => api.post("/marks/bulk", payload),

  // ---- Result Export (additive) ----
  getExportData: (params) => api.get("/marks/export-data", { params }),
  // Both return raw axios responses with blob data — caller triggers the download
  exportPDF: (params) => api.get("/marks/export/pdf", { params, responseType: "blob" }),
  exportExcel: (params) => api.get("/marks/export/excel", { params, responseType: "blob" }),
};