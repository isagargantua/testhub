const apiUrl = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/$/, "");

// On free-tier hosting each service sleeps independently and takes ~24s to
// wake. If we let them wake one-by-one as the user navigates (gateway on load,
// auth on login, core on dashboard) the delays stack up. Instead, fire a
// best-effort ping at every service the moment the app loads so they all cold
// start in parallel and are warm by the time the user actually needs them.
//
// These are fire-and-forget: the auth/core pings return 401 without a token,
// and CORS may block reading the response — neither matters. The request still
// reaches the service and wakes it, which is the only goal here.
export function warmupServices() {
  const endpoints = [
    `${apiUrl}/health`, // gateway
    `${apiUrl}/api/auth/me`, // proxied -> wakes auth-service
    `${apiUrl}/api/projects`, // proxied -> wakes core-service
  ];

  endpoints.forEach((url) => {
    fetch(url, { method: "GET", mode: "cors", cache: "no-store" }).catch(() => {
      // Expected while a service is still waking; ignore.
    });
  });
}

// Manual, awaitable wake-up — used by the "Wake services" button on the login
// page. Unlike warmupServices() (fire-and-forget on load), this resolves once
// all three services have responded (or timed out), so the UI can show a status
// and automation can explicit-wait on it. It wakes all three THROUGH the gateway
// (no need for the separate per-service hostnames):
//   /health           -> gateway
//   /api/auth/me       -> proxied, wakes auth-service (401 is fine)
//   /api/projects      -> proxied, wakes core-service (401 is fine)
// Returns { gatewayAwake: boolean } — gatewayAwake is true if the gateway
// health check returned a response.
export async function wakeServices({ timeoutMs = 70000 } = {}) {
  const endpoints = [
    `${apiUrl}/health`,
    `${apiUrl}/api/auth/me`,
    `${apiUrl}/api/projects`,
  ];

  const pings = endpoints.map((url) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
  });

  const results = await Promise.allSettled(pings);
  return { gatewayAwake: results[0].status === "fulfilled" };
}

// Services sleep after ~15 min idle. If the user leaves the tab open and comes
// back later, the next click would cold-start a service. Re-warm on tab focus
// (throttled to once per 10 min) so the services are already waking by the time
// the user interacts — turning a would-be failure into, at worst, a short wait.
let lastWarmAt = Date.now();

if (typeof window !== "undefined") {
  const maybeRewarm = () => {
    if (document.visibilityState && document.visibilityState !== "visible") {
      return;
    }
    if (Date.now() - lastWarmAt > 10 * 60 * 1000) {
      lastWarmAt = Date.now();
      warmupServices();
    }
  };

  window.addEventListener("focus", maybeRewarm);
  document.addEventListener("visibilitychange", maybeRewarm);
}
