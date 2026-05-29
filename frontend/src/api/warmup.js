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

// Probe one endpoint and decide whether the service behind it is actually AWAKE.
//
// Key point: fetch() "succeeds" for ANY HTTP response, including the 5xx that
// the gateway / Render edge returns while a service is still cold-booting. So
// "got a response" is NOT the same as "awake". A service is only awake when it
// returns a non-5xx status:
//   - /health        -> 200 once the gateway is up
//   - /api/auth/me    -> 401 once auth-service is up (no token)
//   - /api/projects   -> 401 once core-service is up (no token)
// A 5xx, a network error, a CORS rejection, or a timeout all mean "not awake".
async function probeOne(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      signal: controller.signal,
    });
    return res.status < 500; // 200/401/etc = awake; 5xx = still booting
  } catch {
    return false; // network error / CORS / aborted timeout = not awake
  } finally {
    clearTimeout(timer);
  }
}

// Probe all three services (through the gateway) and report which are awake.
// Use a SHORT timeout for passive status polls — a cold service simply reports
// "not awake" instead of hanging.
export async function probeServices({ timeoutMs = 8000 } = {}) {
  const [gatewayAwake, authAwake, coreAwake] = await Promise.all([
    probeOne(`${apiUrl}/health`, timeoutMs),
    probeOne(`${apiUrl}/api/auth/me`, timeoutMs),
    probeOne(`${apiUrl}/api/projects`, timeoutMs),
  ]);
  return {
    gatewayAwake,
    authAwake,
    coreAwake,
    allAwake: gatewayAwake && authAwake && coreAwake,
  };
}

// Manual, awaitable wake-up — used by the "Wake services" buttons. Uses a long
// timeout so a cold service has time to actually boot and respond, then reports
// the real state. Returns the same shape as probeServices().
export async function wakeServices({ timeoutMs = 70000 } = {}) {
  return probeServices({ timeoutMs });
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
