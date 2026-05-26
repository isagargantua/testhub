import axios from "axios";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
} from "./tokenStorage";

const apiUrl = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/$/, "");

const client = axios.create({
  baseURL: apiUrl,
});

let refreshRequest = null;

client.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || "";
    const isAuthRequest =
      requestUrl.includes("/api/auth/login") ||
      requestUrl.includes("/api/auth/register") ||
      requestUrl.includes("/api/auth/refresh") ||
      requestUrl.includes("/api/auth/logout");

    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !isAuthRequest
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = getRefreshToken();

        if (!refreshToken) {
          throw new Error("Missing refresh token");
        }

        if (!refreshRequest) {
          refreshRequest = axios
            .post(`${apiUrl}/api/auth/refresh`, {
              refreshToken,
            })
            .finally(() => {
              refreshRequest = null;
            });
        }

        const response = await refreshRequest;

        const newAccessToken =
          response.data.accessToken;

        localStorage.setItem("accessToken", newAccessToken);

        originalRequest.headers.Authorization =
          `Bearer ${newAccessToken}`;

        return client(originalRequest);
      } catch {
        clearTokens();

        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default client;
