import api from "./api";

export const studentService = {
  getMyProfile: () => api.get("/students/me/profile"),
  getAll: (params) => api.get("/students", { params }),
  getById: (id) => api.get(`/students/${id}`),
  create: (payload) => api.post("/students", payload),
  update: (id, payload) => api.put(`/students/${id}`, payload),
  remove: (id) => api.delete(`/students/${id}`),
  uploadPhoto: (id, formData) =>
    api.put(`/students/${id}/photo`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  export: (format, params) =>
    api.get("/students/export", { params: { ...params, format }, responseType: "blob" }),

  // ---- Bulk Student Import (additive) ----
  downloadImportTemplate: () => api.get("/students/import/template", { responseType: "blob" }),
  previewImport: (formData) =>
    api.post("/students/import/preview", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  executeImport: (payload) => api.post("/students/import/execute", payload),
  downloadCredentialsExcel: (credentials) =>
    api.post("/students/import/credentials-excel", { credentials }, { responseType: "blob" }),
  exportAsTemplate: () => api.get("/students/export-template", { responseType: "blob" }),
};