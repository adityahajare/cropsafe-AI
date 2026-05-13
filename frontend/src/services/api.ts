import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/* ============================================
   AXIOS INSTANCE
============================================ */

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

/* ============================================
   REQUEST INTERCEPTOR (JWT ATTACH)
============================================ */

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* ============================================
   RESPONSE INTERCEPTOR (GLOBAL ERROR HANDLING)
============================================ */

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url;

    console.error("API ERROR:", {
      status,
      url,
      message: error?.response?.data,
    });

    // Auto logout on unauthorized
    if (status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // optional: redirect to login
      // window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

/* ============================================
   EXPORTS
============================================ */

export { API_BASE_URL };
export default api;