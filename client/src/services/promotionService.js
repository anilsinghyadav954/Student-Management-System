import api from "./api";

export const promotionService = {
  getCandidates: (params) => api.get("/students/promotion/candidates", { params }),
  execute: (payload) => api.post("/students/promotion/execute", payload),
  getHistory: (studentId) => api.get(`/students/promotion/history/${studentId}`),
};