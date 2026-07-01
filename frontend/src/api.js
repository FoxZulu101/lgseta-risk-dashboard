// API base + local JWT session + global fetch interceptor.
// Extracted from App.jsx. The interceptor self-installs on import.

// API base is configurable via Vite env (VITE_API_URL) so the app can point at a
// local backend in dev; production (Netlify) leaves it unset and uses Render.
const API = import.meta.env.VITE_API_URL || "https://lgseta-risk-dashboard.onrender.com";

// ─── AUTH ─────────────────────────────────────────────────────────────────────
// Local JWT session. The token is attached to every API request by the global
// fetch interceptor below, so the ~100 existing fetch call-sites stay untouched.
const TOKEN_KEY = "bjmapex_token";
const USER_KEY  = "bjmapex_user";
let AUTH_TOKEN = (typeof localStorage !== "undefined" && localStorage.getItem(TOKEN_KEY)) || null;

function setToken(t) {
  AUTH_TOKEN = t || null;
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else   localStorage.removeItem(TOKEN_KEY);
}
function storedUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); }
  catch (e) { return null; }
}
function saveSession(token, user) {
  setToken(token);
  localStorage.setItem(USER_KEY, JSON.stringify(user || null));
}
function clearSession() {
  setToken(null);
  localStorage.removeItem(USER_KEY);
}

// Global fetch interceptor: for any request to our API, attach the bearer token
// and, on a 401, clear the session and signal the app to return to the login
// screen. Non-API requests pass through untouched. Installed once.
if (typeof window !== "undefined" && !window.__bjmapexFetchPatched) {
  const _origFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    init = init || {};
    const url = typeof input === "string" ? input : (input && input.url) || "";
    if (url.indexOf(API) === 0) {
      const isLogin = url.indexOf("/api/auth/login") !== -1;
      if (AUTH_TOKEN) {
        init = { ...init, headers: { ...(init.headers || {}), Authorization: "Bearer " + AUTH_TOKEN } };
      }
      return _origFetch(input, init).then(res => {
        if (res.status === 401 && !isLogin) {
          clearSession();
          window.dispatchEvent(new Event("bjmapex-unauthorized"));
        }
        return res;
      });
    }
    return _origFetch(input, init);
  };
  window.__bjmapexFetchPatched = true;
}

export { API, TOKEN_KEY, USER_KEY, setToken, storedUser, saveSession, clearSession };
