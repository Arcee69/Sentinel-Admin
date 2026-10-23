import axios from "axios";
import { toApiError } from "./errors";
import { clearSession, getToken } from "./session";

const apiUrl: string = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";

/** Fired when the API rejects the session; AuthContext signs out on it. */
export const UNAUTHORIZED_EVENT = "sentinel:unauthorized";

const apiInstance = axios.create({
  baseURL: apiUrl,
  // The API can be slow to answer; fail visibly rather than hang forever.
  timeout: 120_000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

apiInstance.interceptors.request.use((config) => {
  const token = getToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Let the browser set the multipart boundary for file uploads.
  if (config.data instanceof FormData) {
    config.headers.delete("Content-Type");
  }
  return config;
});

apiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = toApiError(error);
    // A 401 from the login form is a wrong password, not an expired session.
    const isLogin = error?.config?.url?.includes("/auth/login");
    if (apiError.isUnauthorized && !isLogin && getToken()) {
      clearSession();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(apiError);
  },
);

export default apiInstance;
