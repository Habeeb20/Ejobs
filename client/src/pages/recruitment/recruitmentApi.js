// src/api/recruitmentApi.js
// Uses your shared axios instance (same one exported from api.js). Adjust the import if yours lives elsewhere.

import api from "../../api.js";
const BASE = "/recruitment";
const data = (promise) => promise.then((r) => r.data);

export const recruitmentApi = {
  // public + employer
  catalog: () => data(api.get(`${BASE}/catalog`)),
  quote: (body) => data(api.post(`${BASE}/quote`, body)),
  createRequest: (body) => data(api.post(`${BASE}/requests`, body)),
  myRequests: () => data(api.get(`${BASE}/requests`)),
  myRequest: (id) => data(api.get(`${BASE}/requests/${id}`)),
  cancelRequest: (id, reason) => data(api.post(`${BASE}/requests/${id}/cancel`, { reason })),
  paystackInit: (id, paymentId) => data(api.post(`${BASE}/requests/${id}/payments/${paymentId}/paystack/initialize`)),
  paystackVerify: (id, paymentId) => data(api.post(`${BASE}/requests/${id}/payments/${paymentId}/paystack/verify`)),
  submitProof: (id, paymentId, body) => data(api.post(`${BASE}/requests/${id}/payments/${paymentId}/proof`, body)),
  decide: (id, cid, body) => data(api.post(`${BASE}/requests/${id}/candidates/${cid}/decision`, body)),
  createChange: (id, body) => data(api.post(`${BASE}/requests/${id}/changes`, body)),
  createReplacement: (id, body) => data(api.post(`${BASE}/requests/${id}/replacements`, body)),

  // admin
  admin: {
    overview: () => data(api.get(`${BASE}/admin/overview`)),
    requests: (params) => data(api.get(`${BASE}/admin/requests`, { params })),
    request: (id) => data(api.get(`${BASE}/admin/requests/${id}`)),
    updateRequest: (id, body) => data(api.patch(`${BASE}/admin/requests/${id}`, body)),
    searchJobseekers: (q) => data(api.get(`${BASE}/admin/jobseekers`, { params: { q } })),
    addCandidate: (id, body) => data(api.post(`${BASE}/admin/requests/${id}/candidates`, body)),
    updateCandidate: (id, cid, body) => data(api.patch(`${BASE}/admin/requests/${id}/candidates/${cid}`, body)),
    removeCandidate: (id, cid) => data(api.delete(`${BASE}/admin/requests/${id}/candidates/${cid}`)),
    addDocument: (id, body) => data(api.post(`${BASE}/admin/requests/${id}/documents`, body)),
    removeDocument: (id, docId) => data(api.delete(`${BASE}/admin/requests/${id}/documents/${docId}`)),
    addNote: (id, body) => data(api.post(`${BASE}/admin/requests/${id}/notes`, body)),
    payments: (params) => data(api.get(`${BASE}/admin/payments`, { params })),
    decidePayment: (paymentId, body) => data(api.post(`${BASE}/admin/payments/${paymentId}/decision`, body)),
    changes: (params) => data(api.get(`${BASE}/admin/changes`, { params })),
    decideChange: (changeId, body) => data(api.post(`${BASE}/admin/changes/${changeId}/decision`, body)),
    replacements: (params) => data(api.get(`${BASE}/admin/replacements`, { params })),
    decideReplacement: (replId, body) => data(api.post(`${BASE}/admin/replacements/${replId}/decision`, body)),
    plans: () => data(api.get(`${BASE}/admin/plans`)),
    updatePlan: (key, body) => data(api.put(`${BASE}/admin/plans/${key}`, body)),
  },
};

export default recruitmentApi;