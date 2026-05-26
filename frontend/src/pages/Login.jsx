import { useState } from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

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

  return "Could not log in. Please try again.";
}

export default function Login() {
  const { login } = useAuth();

  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <div className="auth-shell">
      <section className="auth-hero flex flex-col justify-between">
        <div>
          <div className="section-kicker">Premium test orchestration</div>
          <h1 className="display-title mt-5 max-w-xl text-5xl leading-[0.92] md:text-6xl">
            Automation deserves a control room, not a blank form.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[#ddcfbf]">
            TestHub brings your API and automation work into a more composed
            workspace with cleaner flows, calmer visuals, and less friction.
          </p>
        </div>

        <div className="space-y-5">
          <div className="metric-grid">
            <div className="metric-chip">
              <div className="section-kicker">Focused</div>
              <div className="mt-3 display-title text-3xl">50-100</div>
              <p className="mt-2 text-sm text-[#d9ccbc]">
                Ideal account pool for repeatable automation cycles.
              </p>
            </div>
            <div className="metric-chip">
              <div className="section-kicker">Reliable</div>
              <div className="mt-3 display-title text-3xl">Smooth</div>
              <p className="mt-2 text-sm text-[#d9ccbc]">
                Login, reuse, delete, and rerun without auth feeling fragile.
              </p>
            </div>
            <div className="metric-chip">
              <div className="section-kicker">Curated</div>
              <div className="mt-3 display-title text-3xl">Premium</div>
              <p className="mt-2 text-sm text-[#d9ccbc]">
                Intentional surfaces instead of generic admin-panel monotony.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-form-card">
        <div className="card">
          <div className="eyebrow">Sign in</div>
          <h2 className="display-title mt-3 text-4xl">Welcome back</h2>
          <p className="mt-3 text-sm leading-6 text-[#736556]">
            Enter your account details to continue into the workspace.
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
                value={password}
                autoComplete="current-password"
                placeholder="Enter your password"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button className="btn w-full" disabled={submitting}>
              {submitting ? "Logging in..." : "Enter TestHub"}
            </button>
          </form>

          <p className="mt-6 text-sm text-[#736556]">
            New to TestHub?{" "}
            <Link to="/register" className="font-semibold text-[#a45b31]">
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
