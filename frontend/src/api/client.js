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
  // Per-request timeout. Free-tier cold start is ~24s for one service, up to
  // ~50s when the gateway AND an upstream are both asleep. 60s covers a stacked
  // cold start; if a request hangs past that, it aborts and the retry below
  // hits a now-warmer service rather than blocking the UI forever.
  timeout: 60000,
});

// Free-tier services (gateway, auth, core) sleep after ~15 min idle and take
// ~24s each to wake. A request landing during a cold start fails with a network
// error, an aborted timeout, or ANY 5xx from the gateway/edge before the
// upstream is ready. Rather than surface that as a hard failure, retry
// transparently with backoff so the call simply waits for the service to come
// up. Budget ~95s of backoff (plus per-attempt time), comfortably covering even
// a stacked gateway+upstream cold start.
const MAX_COLD_START_RETRIES = 8;
const RETRY_DELAY_MS = (attempt) => Math.min(5000 * attempt, 15000);

function isColdStartError(error) {
  // No response = network error OR our per-request timeout firing while a
  // service is still booting. Any 5xx = the gateway couldn't get a clean
  // response from a cold/booting upstream (it returns 500/502/503/504 depending
  // on how the connection failed). On free-tier these are all transient.
  if (!error.response) return true;
  const status = error.response.status;
  return status >= 500 && status < 600;
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

    // A user-canceled request (AbortController) must never be retried or
    // treated as a cold-start failure — surface the cancellation as-is.
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

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
