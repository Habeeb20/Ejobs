// ⚠ Change the next line to however your api.js exports its axios instance.
import { api } from "../../api";

export const videosApi = {
  list: (params) => api.get("/admin/videos", { params }),
  create: (body) => api.post("/admin/videos", body),
  update: (id, body) => api.put(`/admin/videos/${id}`, body),
  remove: (id) => api.delete(`/admin/videos/${id}`),
};