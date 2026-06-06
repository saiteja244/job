import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "/api";

const API = axios.create({
  baseURL,
  timeout: 120000,
});

// Let the browser set multipart boundary automatically for FormData
API.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    if (config.headers) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error.response?.data;
    const message =
      data?.error ||
      data?.message ||
      (typeof data === "string" ? data : null) ||
      error.message ||
      "Request failed";
    const err = new Error(message);
    err.status = error.response?.status;
    err.recoverable = error.response?.status === 400;
    return Promise.reject(err);
  }
);

export default API;
