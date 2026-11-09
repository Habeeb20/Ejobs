// Small fetch wrapper. If you already have an axios instance, replace this file with one
// that exposes the same get / post / patch methods.
const BASE_URL = (import.meta.env?.VITE_BACKEND_URL || "http://localhost:2000/api").replace(/\/$/, "");

const getToken = () => localStorage.getItem("token"); // change to wherever you keep your JWT

async function request(method, path, { params, body } = {}) {
  const query = new URLSearchParams(
    Object.entries(params || {}).filter(([, v]) => v !== "" && v != null)
  ).toString();

  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}${query ? `?${query}` : ""}`, {
    method,

    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

export const adminApi = {
  get: (path, params) => request("GET", path, { params }),
  post: (path, body) => request("POST", path, { body }),
  patch: (path, body) => request("PUT", path, { body }),
};