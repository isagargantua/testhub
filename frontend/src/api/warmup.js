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
