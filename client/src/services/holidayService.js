import api from "./api";

export const holidayService = {
  getAll: (params) => api.get("/holidays", { params }),
  getForMonth: (params) => api.get("/holidays/month", { params }),
  checkDate: (date) => api.get("/holidays/check", { params: { date } }),
  create: (payload) => api.post("/holidays", payload),
  update: (id, payload) => api.put(`/holidays/${id}`, payload),
  remove: (id) => api.delete(`/holidays/${id}`),
};