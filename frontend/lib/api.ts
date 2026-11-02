import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance with default config
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor for auth
api.interceptors.request.use(
  (config) => {
    // Authentication is handled by HTTP-only cookies automatically
    // No need to manually add Authorization header
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // The session expired: go back to the login page (served at "/").
      // A failed login attempt is also a 401, but must stay on the form so it can show its error.
      const isLoginRequest = error.config?.url?.includes('/users/login/');
      const onLoginPage = window.location.pathname === '/';
      if (!isLoginRequest && !onLoginPage) {
        localStorage.removeItem('userData');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
