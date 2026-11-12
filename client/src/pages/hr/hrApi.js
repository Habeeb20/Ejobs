import api from "../../api"; // your axios instance (it adds the Bearer token)

// Every HR request gives up after 20 seconds, so a screen can never wait forever.
const T = { timeout: 20000 };
const get = (url, params) => api.get(url, { ...T, params });
const post = (url, data) => api.post(url, data, T);
const put = (url, data) => api.put(url, data, T);
// const put = (url, data) => api.put(url, data, T);
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
  updateTask: (id, taskId, data) => put(`/hr/employees/${id}/tasks/${taskId}`, data),
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
    toggleTask: (e, taskId, done) => put(`/hr/me/${e}/tasks/${taskId}`, { done }),
    messages: (e) => get(`/hr/me/${e}/messages`),
    sendMessage: (e, body) => post(`/hr/me/${e}/messages`, { body }),
    announcements: (e) => get(`/hr/me/${e}/announcements`),
    readAnnouncement: (e, id) => post(`/hr/me/${e}/announcements/${id}/read`),
    cases: (e) => get(`/hr/me/${e}/cases`),
    respondCase: (e, id, response) => post(`/hr/me/${e}/cases/${id}/respond`, { response }),
  },
};