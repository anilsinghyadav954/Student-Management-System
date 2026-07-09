import api from "./api";

export const userService = {
  updateMyProfile: (payload) => api.put("/users/me", payload),
  updateMyPhoto: (formData) =>
    api.put("/users/me/photo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};
