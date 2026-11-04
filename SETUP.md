

### 4. Hide blacklisted people from the public

Add `isBlacklisted: { $ne: true }` to your public candidate search and employer listings,
and decide what happens to an employer's jobs: see `afterBlacklist` in `utils/blacklist.js`
(the examples there are commented out because they depend on your Job / Application models).

### 5. Env (optional, for the emails)

```
SUPPORT_EMAIL=support@yourdomain.com
SMTP_HOST= SMTP_PORT= SMTP_USER= SMTP_PASS= MAIL_FROM=
```

Swagger: your swagger-jsdoc `apis` list must include `./routes/*.js`, and `bearerAuth` must be
defined in `components.securitySchemes`.

## Frontend

Copy `src/pages/superadmin/Blacklist.jsx` and the `src/components/blacklist/` folder.

### 1. Add to your api file (the one that exports `api`, `getError`, `authApi` ...)

```js
export const blacklistApi = {
  stats: () => api.get("/blacklist/stats"),
  list: (params) => api.get("/blacklist", { params }),
  eligible: (params, signal) => api.get("/blacklist/eligible", { params, signal }),
  blacklist: (userId, data) => api.post(`/blacklist/${userId}`, data),
  lift: (userId, data) => api.post(`/blacklist/${userId}/lift`, data),
  history: (userId) => api.get(`/blacklist/${userId}/history`),
};

// Signs out someone who gets blacklisted while they are logged in
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const data = err?.response?.data;
    if (err?.response?.status === 403 && data?.code === "ACCOUNT_BLACKLISTED") {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      sessionStorage.setItem("blacklisted", JSON.stringify({ message: data.message, reason: data.reason }));
      if (!window.location.pathname.startsWith("/login")) window.location.assign("/login");
    }
    return Promise.reject(err);
  }
);
```

### 2. Add the route

```jsx
<Route path="/superadmin/blacklist" element={<Blacklist />} />
```

(the page redirects anyone who is not a superadmin)

### 3. Show the message on the Login page

```jsx
import BlacklistedNotice from "../../components/blacklist/BlacklistedNotice";

// state
const [blacklisted, setBlacklisted] = useState(() => {
  try {
    const saved = sessionStorage.getItem("blacklisted");
    sessionStorage.removeItem("blacklisted");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
});

// in the catch of submit()
if (err?.response?.data?.code === "ACCOUNT_BLACKLISTED") {
  setBlacklisted(err.response.data);
  return;
}

// in the JSX, above the error alert
<BlacklistedNotice info={blacklisted} />
```

### Blacklist from other pages

On any users table, add a button that opens the same modal with the user already chosen:

```jsx
<BlacklistModal open={!!target} presetUser={target} onClose={() => setTarget(null)} onDone={reload} />
```

Env (optional): `VITE_SUPPORT_EMAIL=support@yourdomain.com`
