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

// Free-tier services sleep after ~15 min idle and take ~24s to wake. A request
// that lands during a cold start fails with a network error or a 502/503/504
// from Render's edge before the service is ready. Rather than surface that as a
// hard failure, retry transparently with backoff so the call simply waits for
// the service to come up. Total budget ~90s, comfortably covering a cold start.
const MAX_COLD_START_RETRIES = 7;
const RETRY_DELAY_MS = (attempt) => Math.min(5000 * attempt, 15000);

function isColdStartError(error) {
  const status = error.response?.status;
  // No response at all = network error/timeout. 502/503/504 = edge couldn't
  // reach the waking service. All are transient cold-start signals.
  return !error.response || status === 502 || status === 503 || status === 504;
}

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

    // Transparently retry transient cold-start failures before treating the
    // request as failed, so login/data loads "just wait, then work".
    if (originalRequest && isColdStartError(error)) {
      originalRequest._coldStartRetries =
        originalRequest._coldStartRetries || 0;

      if (originalRequest._coldStartRetries < MAX_COLD_START_RETRIES) {
        originalRequest._coldStartRetries += 1;

        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY_MS(originalRequest._coldStartRetries))
        );

        return client(originalRequest);
      }
    }

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
