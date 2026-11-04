// Put this next to MyJobs.jsx.
// ⚠ Change the next line to however your api.js exports its axios instance
// (jobsApi in ../../api is built on it).

import api from "../../api";
const base = "/engagement";

export const engageApi = {
  // boosts
  boostPlans: () => api.get(`${base}/boost/plans`),
  boostPay: (jobId, plan) => api.post(`${base}/jobs/${jobId}/boost/payment`, { plan }),
  boostConfirm: (jobId, reference) => api.post(`${base}/jobs/${jobId}/boost/confirm`, { reference }),
  suggestions: (jobId) => api.get(`${base}/jobs/${jobId}/suggestions`),

  // status change now accepts { status, reason, subject, message }
  setStatus: (appId, body) => api.put(`/jobs/applications/${appId}/status`, body),
  history: (appId) => api.get(`${base}/applications/${appId}/history`),
  respond: (appId, body) => api.post(`${base}/applications/${appId}/respond`, body),

  // physical interview
  physicalInvite: (appId, body) => api.post(`${base}/applications/${appId}/physical-interview`, body),
  physicalPay: (appId) => api.post(`${base}/applications/${appId}/physical-interview/pay`),
  physicalConfirm: (appId, reference) =>
    api.post(`${base}/applications/${appId}/physical-interview/confirm`, { reference }),

  // talent search + work history
  talent: (params) => api.get(`${base}/talent`, { params }),
  talentProfile: (id) => api.get(`${base}/talent/${id}`),
  invite: (id, body) => api.post(`${base}/talent/${id}/invite`, body),
  workHistory: (seekerId) => api.get(`${base}/seekers/${seekerId}/work-history`),
  myWorkHistory: () => api.get(`${base}/work-history/mine`),

  // jobseeker account boost
  accountBoost: () => api.get(`${base}/account-boost`),
  accountBoostPay: () => api.post(`${base}/account-boost/payment`),
  accountBoostConfirm: (reference) => api.post(`${base}/account-boost/confirm`, { reference }),
};