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

export const blacklistApi = {
  stats: () => api.get("/blacklist/stats"),
  list: (params) => api.get("/blacklist", { params }),
  eligible: (params, signal) => api.get("/blacklist/eligible", { params, signal }),
  blacklist: (userId, data) => api.post(`/blacklist/${userId}`, data),
  lift: (userId, data) => api.post(`/blacklist/${userId}/lift`, data),
  history: (userId) => api.get(`/blacklist/${userId}/history`),
};

export const adminApi = {
  login: (data) => api.post("/admin/login", data),
};

export const userApi = {
  // Logged-in user's details (including role) from the saved token
  getMe: () => api.get("/users/me"),
  updateProfile: (data) => api.put("/users/profile", data),
};

export const employersApi = {
  list: (params) => api.get("/employers", { params }),
  details: (id) => api.get(`/employers/${id}`),
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
    setState: (id, action) => api.put(`/ads/admin/${id}/state`, { action }),
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


// Every HR request gives up after 20 seconds, so a screen can never wait forever.
const T = { timeout: 20000 };
const get = (url, params) => api.get(url, { ...T, params });
const post = (url, data) => api.post(url, data, T);
const put = (url, data) => api.put(url, data, T);
const patch = (url, data) => api.patch(url, data, T);
const del = (url) => api.delete(url, T);

export const hrApi = {
  // employer: overview and settings
  overview: () => get("/hr/overview"),
  settings: () => get("/hr/settings"),
  saveSettings: (data) => put("/hr/settings", data),
  // employees
  employees: (params) => get("/hr/employees", params),
  addEmployee: (data) => post("/hr/employees", data),
  hireCandidates: () => get("/hr/hire-candidates"),
  hireFromApplication: (applicationId, data) => post(`/hr/employees/from-application/${applicationId}`, data),
  employee: (id) => get(`/hr/employees/${id}`),
  updateEmployee: (id, data) => put(`/hr/employees/${id}`, data),
  setStatus: (id, data) => post(`/hr/employees/${id}/status`, data),
  activity: (id) => get(`/hr/employees/${id}/activity`),
  addDoc: (id, data) => post(`/hr/employees/${id}/documents`, data),
  removeDoc: (id, docId) => del(`/hr/employees/${id}/documents/${docId}`),
  addTask: (id, data) => post(`/hr/employees/${id}/tasks`, data),
  updateTask: (id, taskId, data) => patch(`/hr/employees/${id}/tasks/${taskId}`, data),
  removeTask: (id, taskId) => del(`/hr/employees/${id}/tasks/${taskId}`),
  // leave
  leave: (params) => get("/hr/leave", params),
  leaveBalances: (year) => get("/hr/leave/balances", { year }),
  createLeave: (data) => post("/hr/leave", data),
  decideLeave: (id, action, note) => post(`/hr/leave/${id}/decision`, { action, note }),
  // attendance
  attDay: (date) => get("/hr/attendance/day", { date }),
  attReport: (month) => get("/hr/attendance/report", { month }),
  attMark: (data) => post("/hr/attendance/mark", data),
  // payroll
  payroll: (month) => get("/hr/payroll", { month }),
  generatePayroll: (month) => post("/hr/payroll/generate", { month }),
  publishPayroll: (month, ids) => post("/hr/payroll/publish", { month, ids }),
  markPaid: (month, reference, ids) => post("/hr/payroll/paid", { month, reference, ids }),
  updatePayslip: (id, data) => put(`/hr/payroll/${id}`, data),
  recalcPayslip: (id) => post(`/hr/payroll/${id}/recalculate`),
  deletePayslip: (id) => del(`/hr/payroll/${id}`),
  // performance
  reviews: (params) => get("/hr/reviews", params),
  createReview: (data) => post("/hr/reviews", data),
  updateReview: (id, data) => put(`/hr/reviews/${id}`, data),
  publishReview: (id) => post(`/hr/reviews/${id}/publish`),
  deleteReview: (id) => del(`/hr/reviews/${id}`),
  goals: (params) => get("/hr/goals", params),
  createGoal: (data) => post("/hr/goals", data),
  updateGoal: (id, data) => put(`/hr/goals/${id}`, data),
  deleteGoal: (id) => del(`/hr/goals/${id}`),
  cases: (params) => get("/hr/cases", params),
  createCase: (data) => post("/hr/cases", data),
  closeCase: (id) => post(`/hr/cases/${id}/close`),
  // communication
  announcements: () => get("/hr/announcements"),
  createAnnouncement: (data) => post("/hr/announcements", data),
  deleteAnnouncement: (id) => del(`/hr/announcements/${id}`),
  threads: () => get("/hr/messages/threads"),
  thread: (employeeId) => get(`/hr/messages/${employeeId}`),
  send: (employeeId, body) => post(`/hr/messages/${employeeId}`, { body }),
  // both roles
  notifications: () => get("/hr/notifications"),
  readNotifications: (data) => post("/hr/notifications/read", data),
  // the employee's own dashboard
  me: {
    employments: () => get("/hr/me/employments"),
    overview: (e) => get(`/hr/me/${e}/overview`),
    profile: (e, data) => put(`/hr/me/${e}/profile`, data),
    attendance: (e, month) => get(`/hr/me/${e}/attendance`, { month }),
    clockIn: (e) => post(`/hr/me/${e}/clock-in`),
    clockOut: (e) => post(`/hr/me/${e}/clock-out`),
    leave: (e, year) => get(`/hr/me/${e}/leave`, { year }),
    requestLeave: (e, data) => post(`/hr/me/${e}/leave`, data),
    cancelLeave: (e, id) => post(`/hr/me/${e}/leave/${id}/cancel`),
    payslips: (e) => get(`/hr/me/${e}/payslips`),
    payslip: (e, id) => get(`/hr/me/${e}/payslips/${id}`),
    reviews: (e) => get(`/hr/me/${e}/reviews`),
    ackReview: (e, id, comment) => post(`/hr/me/${e}/reviews/${id}/acknowledge`, { comment }),
    goals: (e) => get(`/hr/me/${e}/goals`),
    createGoal: (e, data) => post(`/hr/me/${e}/goals`, data),
    updateGoal: (e, id, data) => put(`/hr/me/${e}/goals/${id}`, data),
    uploadDoc: (e, data) => post(`/hr/me/${e}/documents`, data),
    removeDoc: (e, docId) => del(`/hr/me/${e}/documents/${docId}`),
    toggleTask: (e, taskId, done) => patch(`/hr/me/${e}/tasks/${taskId}`, { done }),
    messages: (e) => get(`/hr/me/${e}/messages`),
    sendMessage: (e, body) => post(`/hr/me/${e}/messages`, { body }),
    announcements: (e) => get(`/hr/me/${e}/announcements`),
    readAnnouncement: (e, id) => post(`/hr/me/${e}/announcements/${id}/read`),
    cases: (e) => get(`/hr/me/${e}/cases`),
    respondCase: (e, id, response) => post(`/hr/me/${e}/cases/${id}/respond`, { response }),
  },
};


export default api;














