import api from "./api";

export const authService = {
  login: (email, password) => api.post("/auth/login", { email, password }),

  forgotPassword: (email) => api.post("/auth/forgot-password", { email }),

  verifyOtp: (email, otp) => api.post("/auth/verify-otp", { email, otp }),

  resetPassword: (resetToken, newPassword) =>
    api.post("/auth/reset-password", { resetToken, newPassword }),

  changePassword: (currentPassword, newPassword) =>
    api.put("/auth/change-password", { currentPassword, newPassword }),

  getMe: () => api.get("/auth/me"),

  logout: () => api.post("/auth/logout"),
};
