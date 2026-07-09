import api from "./api";

export const marksService = {
  add: (payload) => api.post("/marks", payload),
  update: (id, payload) => api.put(`/marks/${id}`, payload),
  remove: (id) => api.delete(`/marks/${id}`),
  getForStudent: (studentId, params) => api.get(`/marks/student/${studentId}`, { params }),
};
