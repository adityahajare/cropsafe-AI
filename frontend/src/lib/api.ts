import axios from "axios";

/* ================= BASE URL ================= */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/* ================= AXIOS INSTANCE ================= */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

/* ================= REQUEST INTERCEPTOR ================= */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log(
      `📡 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`
    );

    return config;
  },
  (error) => Promise.reject(error)
);

/* ================= RESPONSE INTERCEPTOR ================= */
api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;

    console.error(`❌ ${status || "NETWORK"} ${url}`, error.response?.data);

    /* ================= AUTO LOGOUT ================= */
    if (status === 401 || status === 403) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      console.warn("🚨 Auth expired → logged out");
    }

    return Promise.reject(error);
  }
);

export default api;
