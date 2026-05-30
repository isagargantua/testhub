const gatewayUrl = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/$/, "");

// Each backend service has its OWN /health endpoint. We hit each service
// DIRECTLY (not through the gateway) so a cold container is woken on its own
// host — proxying through the gateway gives unreliable status when an upstream
// is still booting. The auth/core URLs derive from the gateway URL by service
// name; override with VITE_AUTH_URL / VITE_CORE_URL if your naming differs.
const authUrl = (
  import.meta.env.VITE_AUTH_URL || gatewayUrl.replace("gateway", "auth-service")
).replace(/\/$/, "");
const coreUrl = (
  import.meta.env.VITE_CORE_URL || gatewayUrl.replace("gateway", "core-service")
).replace(/\/$/, "");

const HEALTH = {
  gateway: `${gatewayUrl}/health`,
  auth: `${authUrl}/health`,
  core: `${coreUrl}/health`,
};

// Fire-and-forget wake on app load: ping all three /health endpoints directly
// so every container starts spinning up in parallel.
export function warmupServices() {
  Object.values(HEALTH).forEach((url) => {
    fetch(url, { method: "GET", mode: "cors", cache: "no-store" }).catch(() => {
      // Expected while a service is still waking; ignore.
    });
  });
}

// Hit one service's /health and report whether it is genuinely AWAKE.
//
// A service is awake ONLY when its /health returns 2xx. While a free-tier
// container is cold-booting, Render holds the request and serves 200 once it's
// up (which can take ~30-60s) — so awaiting this with a long timeout both wakes
// the container AND tells the truth. A 5xx, network error, CORS failure, or a
// timeout (still booting) all count as NOT awake. No false "awake" is possible.
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
    return res.ok; // strictly 2xx
  } catch {
    return false; // network error / CORS / aborted timeout = not awake
  } finally {
    clearTimeout(timer);
  }
}

// Probe all three services directly and report which are awake. SHORT timeout
// for passive status polls — a cold service reports "asleep" instead of hanging.
export async function probeServices({ timeoutMs = 8000 } = {}) {
  const [gatewayAwake, authAwake, coreAwake] = await Promise.all([
    probeOne(HEALTH.gateway, timeoutMs),
    probeOne(HEALTH.auth, timeoutMs),
    probeOne(HEALTH.core, timeoutMs),
  ]);
  return {
    gatewayAwake,
    authAwake,
    coreAwake,
    allAwake: gatewayAwake && authAwake && coreAwake,
  };
}

// Manual, awaitable wake-up — used by the "Wake services" buttons. Long timeout
// so a cold container has time to actually boot and answer its /health, then
// reports the real per-service state. Returns the same shape as probeServices().
export async function wakeServices({ timeoutMs = 80000 } = {}) {
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
