import axios from 'axios';

const TOKEN_KEY = 'stm_token';

/**
 * Token storage strategy: JWT kept in localStorage and sent as
 * "Authorization: Bearer ...".
 *
 * Security trade-off: localStorage is readable by JavaScript, so a successful
 * XSS attack could steal the token. We mitigate this with a short token
 * lifetime, never rendering untrusted HTML, and relying on React's escaping.
 * HttpOnly cookies would be stronger but need CSRF protection and same-site
 * hosting. See the README for the full discussion.
 */
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const baseURL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

export const http = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

// Attach the token to every request.
http.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Normalises errors into a predictable shape:
 *   { status, message, errors: [{ field, message }] }
 * and broadcasts a session-expired event on 401 so the UI can log out.
 */
http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;

    if (status === 401 && !error.config?.url?.includes('/auth/login')) {
      tokenStore.clear();
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }

    const normalized = {
      status: status || 0,
      message:
        data?.message ||
        (error.code === 'ECONNABORTED'
          ? 'The request timed out. Please try again.'
          : 'Something went wrong. Please try again.'),
      errors: data?.errors || [],
    };
    return Promise.reject(normalized);
  }
);

export default http;
