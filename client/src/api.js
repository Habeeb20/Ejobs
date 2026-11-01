import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getError = (err) =>
  err?.response?.data?.message || "Something went wrong. Please try again.";

export const onboardingApi = {
  register: (data) => api.post("/users/register", data),
  verifyOtp: (data) => api.post("/users/verify-otp", data),
  resendOtp: (data) => api.post("/users/resend-otp", data),
  completeProfile: (data) => api.put("/users/complete-profile", data),
};

export const authApi = {
  login: (data) => api.post("/users/login", data),
};
export const adminApi = {
  login: (data) => api.post("/admin/login", data),
};

export const userApi = {
  // Logged-in user's details (including role) from the saved token
  getMe: () => api.get("/users/me"),
  updateProfile: (data) => api.put("/users/profile", data),
};


export const statsApi = {
  overview: () => api.get("/stats"),
  industries: () => api.get("/stats/industries"),
};

export const analyticsApi = {
  full: () => api.get("/analytics/full"),
};

export const jobsApi = {
  // public
  plans: () => api.get("/jobs/plans"),
  ads: () => api.get("/jobs/ads"),
  // employer
  create: (data) => api.post("/jobs", data),
  update: (id, data) => api.put(`/jobs/${id}`, data),
  mine: () => api.get("/jobs/mine"),
  submit: (id) => api.post(`/jobs/${id}/submit`),
  pay: (id, purpose = "post") => api.post(`/jobs/${id}/payment`, { purpose }),
  confirm: (id, reference) => api.post(`/jobs/${id}/confirm`, { reference }),
  applicants: (id) => api.get(`/jobs/${id}/applicants`),
  analytics: (id) => api.get(`/jobs/${id}/analytics`),
  setStatus: (appId, status, reason = "") => api.put(`/jobs/applications/${appId}/status`, { status, reason }),
  applicantProfile: (appId) => api.get(`/jobs/applications/${appId}/profile`),
  // job seeker
  browse: (params) => api.get("/jobs/browse", { params }),
  details: (id) => api.get(`/jobs/${id}/details`),
  like: (id) => api.post(`/jobs/${id}/like`),
  share: (id, channel = "other") => api.post(`/jobs/${id}/share`, { channel }),
  publicJobs: (id) => api.get(`/jobs/public/${id}`), // what a shared link opens (no login needed)
  saved: () => api.get("/jobs/saved/mine"),
  all: () => api.get("/jobs/all"),
  myApplications: () => api.get("/jobs/applications/mine"),
  apply: (id, data) => api.post(`/jobs/${id}/apply`, data),
  all: (params) => api.get("/jobs/all", { params }),
follow: (id) => api.post(`/jobs/${id}/follow`),
  // super admin
  admin: {
    pending: () => api.get("/jobs/admin/pending"),
    approve: (id) => api.post(`/jobs/admin/${id}/approve`),
    reject: (id, reason) => api.post(`/jobs/admin/${id}/reject`, { reason }),
  },
};


export const searchApi = {
  suggest: (params, signal) => api.get("/search/suggest", { params, signal }),
  jobs: (params) => api.get("/search/jobs", { params }),
  candidates: (params) => api.get("/search/candidates", { params }),
};

export const adsApi = {
  // public
  active: (params) => api.get("/ads/active", { params }), // live ads for a placement
  click: (id) => api.post(`/ads/${id}/click`),
  packages: () => api.get("/ads/packages"),
  // any logged-in role
  mine: () => api.get("/ads/mine"),
  create: (data) => api.post("/ads", data), // data carries the Cloudinary URL (mediaUrl)
  update: (id, data) => api.put(`/ads/${id}`, data),
  remove: (id) => api.delete(`/ads/${id}`),
  pay: (id) => api.post(`/ads/${id}/payment`),
  confirm: (id, reference) => api.post(`/ads/${id}/confirm`, { reference }),
  submit: (id) => api.post(`/ads/${id}/submit`),
  // admin and super admin
  admin: {
    list: (params) => api.get("/ads/admin/list", { params }),
    approve: (id) => api.post(`/ads/admin/${id}/approve`),
    reject: (id, reason) => api.post(`/ads/admin/${id}/reject`, { reason }),
    setState: (id, action) => api.patch(`/ads/admin/${id}/state`, { action }),
  },
};


const section = (path) => ({
  list: () => api.get(`/users/${path}`),
  create: (data) => api.post(`/users/${path}`, data),
  update: (id, data) => api.put(`/users/${path}/${id}`, data),
  remove: (id) => api.delete(`/users/${path}/${id}`),
});

export const sectionsApi = {
  education: section("education"),
  work: section("work-experience"),
  certificates: section("certificates"),
  guarantors: section("guarantors"),
};

export const cvApi = {
  get: () => api.get("/users/cv"),
  save: (data) => api.put("/users/cv", data),
  attach: (data) => api.post("/users/cv/files", data),
  detach: (format) => api.delete(`/users/cv/files/${format}`),
};

export const overviewApi = {
  get: () => api.get("/overview"),
};

// Paste into src/api.js (above `export default api;`)

export const benefitApi = {
  // job seeker
  eligibility: () => api.get("/benefits/eligibility"),
  request: (data) => api.post("/benefits", data),
  mine: () => api.get("/benefits/mine"),
  myStats: (period) => api.get("/benefits/mine/stats", { params: { period } }),
  myAttendance: () => api.get("/benefits/mine/attendance"),
  // super admin / staff
  admin: {
    list: (params) => api.get("/benefits/admin/requests", { params }),
    get: (id) => api.get(`/benefits/admin/requests/${id}`),
    approve: (id, data) => api.post(`/benefits/admin/requests/${id}/approve`, data),
    reject: (id, reason) => api.post(`/benefits/admin/requests/${id}/reject`, { reason }),
    pay: (id, paymentReference) => api.post(`/benefits/admin/requests/${id}/pay`, { paymentReference }),
    stats: (period) => api.get("/benefits/admin/stats", { params: { period } }),
    getSettings: () => api.get("/benefits/admin/settings"),
    saveSettings: (data) => api.put("/benefits/admin/settings", data),
    checkIn: (data) => api.post("/benefits/admin/attendance", data),
    attendance: (params) => api.get("/benefits/admin/attendance", { params }),
    enforce: () => api.post("/benefits/admin/attendance/enforce"),
  },
};

export default api;








































































