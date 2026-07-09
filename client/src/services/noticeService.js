import api from "./api";

export const noticeService = {
  getAll: (params) => api.get("/notices", { params }),
  getMine: (params) => api.get("/notices/my", { params }),
  create: (payload) => api.post("/notices", payload),
  update: (id, payload) => api.put(`/notices/${id}`, payload),
  remove: (id) => api.delete(`/notices/${id}`),
};
