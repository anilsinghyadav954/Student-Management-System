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
  // Returns a raw axios response with blob data — caller triggers the download
  export: (format, params) =>
    api.get("/students/export", { params: { ...params, format }, responseType: "blob" }),
};
