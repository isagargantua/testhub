import { useState } from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { wakeServices } from "../api/warmup";

function getErrorMessage(error) {
  const response = error?.response?.data;

  if (response?.message) {
    return response.message;
  }

  if (Array.isArray(response?.errors)) {
    return response.errors
      .map((item) => item.msg || item.message)
      .filter(Boolean)
      .join(", ");
  }

  if (error?.response?.status === 429) {
    return "Too many login attempts. Please wait and try again.";
  }

  return "Could not log in. Please try again.";
}

export default function Login() {
  const { login } = useAuth();

  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [waking, setWaking] = useState(false);
  const [wakeStatus, setWakeStatus] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setError("");
      setSubmitting(true);

      await login(email.trim(), password);
      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  // Manually wake the sleeping free-tier services (gateway + auth + core, all
  // through the gateway). Useful when login fails because a service is cold.
  async function handleWake() {
    setWaking(true);
    setWakeStatus("Waking services… this can take up to ~60s on the free tier.");
    try {
      const { gatewayAwake } = await wakeServices();
      setWakeStatus(
        gatewayAwake
          ? "Services are awake. Try signing in now."
          : "Wake attempt finished — give it a few seconds, then sign in."
      );
    } catch {
      setWakeStatus("Wake attempt finished — give it a few seconds, then sign in.");
    } finally {
      setWaking(false);
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-hero flex flex-col justify-between">
        <div>
          <div className="section-kicker">Enterprise Test Management</div>
          <h1 className="display-title mt-5 max-w-xl text-5xl leading-[0.92] md:text-6xl">
            One platform for your entire QA workflow.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[#ddcfbf]">
            Manage projects, organize test suites, execute test runs, and analyze results — all in one centralized platform built for scalable QA teams.
          </p>
        </div>

        <div className="space-y-5">
          <div className="metric-grid">
            <div className="metric-chip">
              <div className="section-kicker">Structured</div>
              <div className="mt-3 display-title text-3xl">Projects</div>
              <p className="mt-2 text-sm text-[#d9ccbc]">
                Organize testing by product area, sprint, or release cycle.
              </p>
            </div>
            <div className="metric-chip">
              <div className="section-kicker">Execution</div>
              <div className="mt-3 display-title text-3xl">Runs</div>
              <p className="mt-2 text-sm text-[#d9ccbc]">
                Real-time PASS/FAIL/SKIP/BLOCKED tracking with full audit trail.
              </p>
            </div>
            <div className="metric-chip">
              <div className="section-kicker">Analytics</div>
              <div className="mt-3 display-title text-3xl">Metrics</div>
              <p className="mt-2 text-sm text-[#d9ccbc]">
                Dashboard pass-rate analytics and result breakdowns across all runs.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-form-card">
        <div className="card">
          <div className="eyebrow">Sign in</div>
          <h2 className="display-title mt-3 text-4xl">Welcome back</h2>
          <p className="mt-3 text-sm leading-6 text-[#64748b]">
            Sign in to access your projects, test suites, and execution dashboards.
          </p>

          {error && (
            <div className="mt-5 rounded-[18px] border border-[rgba(168,80,63,0.18)] bg-[rgba(168,80,63,0.08)] px-4 py-3 text-sm text-[#8b4335]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                data-testid="login-email"
                value={email}
                autoComplete="email"
                placeholder="you@company.com"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                data-testid="login-password"
                value={password}
                autoComplete="current-password"
                placeholder="Enter your password"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button className="btn w-full" data-testid="login-submit" disabled={submitting}>
              {submitting ? "Logging in..." : "Sign In"}
            </button>
          </form>

          {/* Free-tier services sleep after ~15 min idle. If sign-in fails or
              hangs, wake all three (via the gateway) then retry. Exposed with
              data-testid hooks so automation can click + wait deterministically. */}
          <div className="mt-5">
            <button
              type="button"
              className="btn-secondary w-full"
              data-testid="wake-services"
              onClick={handleWake}
              disabled={waking}
            >
              {waking ? "Waking services…" : "Services asleep? Wake them"}
            </button>
            {wakeStatus && (
              <p
                className="mt-2 text-xs text-[#64748b]"
                data-testid="wake-status"
                role="status"
              >
                {wakeStatus}
              </p>
            )}
          </div>

          <p className="mt-6 text-sm text-[#64748b]">
            New to TestHub?{" "}
            <Link to="/register" className="font-semibold text-[#4f46e5]">
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
