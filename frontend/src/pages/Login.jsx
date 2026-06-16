import { useRef, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { wakeServices } from "../api/warmup";
import MascotStage, {
  EyeIcon,
  EyeOff,
  Spark,
  scorePassword,
  strengthToClass,
  useCapsLock,
} from "../components/MascotStage";
import "./Login.css";

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
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [emailHover, setEmailHover] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const [pwHover, setPwHover] = useState(false);
  const [failed, setFailed] = useState(false);
  const [failLevel, setFailLevel] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [waking, setWaking] = useState(false);
  const [wakeStatus, setWakeStatus] = useState("");
  const [wokeSignal, setWokeSignal] = useState(0);

  const emailRef = useRef(null);
  const pwRef = useRef(null);
  const capsOn = useCapsLock();

  const emailActive = emailFocused || emailHover;
  const pwActive = pwFocused || pwHover;

  // Where the buddies look / how they feel (success + fail win over the rest).
  const mode = celebrate
    ? "celebrate"
    : failed
    ? "fail"
    : pwActive && showPassword
    ? "away"
    : pwActive
    ? "password"
    : emailActive
    ? "email"
    : "cursor";

  const watchRef =
    mode === "email" ? emailRef : mode === "password" || mode === "away" ? pwRef : null;
  const watchKey = mode === "email" ? email : password;
  const strengthClass =
    mode === "password" && password.length > 0
      ? strengthToClass(scorePassword(password))
      : "";

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError("");
      setFailed(false);
      setSubmitting(true);
      await login(email.trim(), password);
      setFailLevel(0);
      setCelebrate(true);
      window.setTimeout(() => navigate("/"), 850);
    } catch (err) {
      setError(getErrorMessage(err));
      setFailLevel((level) => level + 1);
      setFailed(true);
      window.setTimeout(() => setFailed(false), 1800);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWake() {
    setWaking(true);
    setWakeStatus(
      "Waking gateway, auth and core services… this can take up to ~90 seconds on the free tier. Please keep this page open."
    );
    try {
      const { allAwake, gatewayAwake, authAwake, coreAwake } =
        await wakeServices();
      if (allAwake) {
        setWakeStatus("✅ All services are awake. You can sign in now.");
        setWokeSignal((n) => n + 1);
      } else {
        const stillDown = [
          !gatewayAwake && "gateway",
          !authAwake && "auth",
          !coreAwake && "core",
        ]
          .filter(Boolean)
          .join(", ");
        setWakeStatus(
          `Still starting: ${stillDown}. Please wait ~20–30 seconds, then click "Wake them" again.`
        );
      }
    } catch {
      setWakeStatus(
        'Could not confirm services are up. Please wait ~30 seconds and click "Wake them" again.'
      );
    } finally {
      setWaking(false);
    }
  }

  return (
    <div className="lg-root">
      <MascotStage
        mode={mode}
        watchRef={watchRef}
        watchKey={watchKey}
        failed={failed}
        failLevel={failLevel}
        celebrate={celebrate}
        capsActive={pwActive && capsOn}
        strengthClass={strengthClass}
        wokeSignal={wokeSignal}
      />

      <div className="lg-form-wrap">
        <div className="lg-form">
          <div className="lg-logo">
            <Spark />
          </div>

          <h1 className="lg-title">Welcome back</h1>
          <p className="lg-subtitle">Please enter your details to sign in.</p>

          {error && (
            <div className="lg-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="lg-field">
              <label className="lg-label" htmlFor="login-email">
                Email
              </label>
              <div
                className="lg-input-row"
                onMouseEnter={() => setEmailHover(true)}
                onMouseLeave={() => setEmailHover(false)}
              >
                <input
                  id="login-email"
                  ref={emailRef}
                  type="email"
                  className="lg-input"
                  data-testid="login-email"
                  value={email}
                  autoComplete="email"
                  placeholder="you@company.com"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <span className="lg-underline" />
              </div>
            </div>

            <div className="lg-field">
              <label className="lg-label" htmlFor="login-password">
                Password
              </label>
              <div
                className="lg-input-row"
                onMouseEnter={() => setPwHover(true)}
                onMouseLeave={() => setPwHover(false)}
              >
                <input
                  id="login-password"
                  ref={pwRef}
                  type={showPassword ? "text" : "password"}
                  className="lg-input"
                  data-testid="login-password"
                  value={password}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  onFocus={() => setPwFocused(true)}
                  onBlur={() => setPwFocused(false)}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <span className="lg-underline" />
                <button
                  type="button"
                  className="lg-toggle"
                  data-testid="toggle-password"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff /> : <EyeIcon />}
                </button>
              </div>
              {pwActive && capsOn && (
                <p className="lg-caps-hint" role="status" data-testid="caps-hint">
                  ⇪ Caps Lock is on
                </p>
              )}
            </div>

            <button
              className={`lg-btn${celebrate ? " is-go" : ""}`}
              data-testid="login-submit"
              disabled={submitting || celebrate}
            >
              <span>
                {celebrate
                  ? "Welcome in ✦"
                  : submitting
                  ? "Signing in…"
                  : "Sign in"}
              </span>
            </button>
          </form>

          <div className="lg-wake">
            <button
              type="button"
              className="lg-wake-btn"
              data-testid="wake-services"
              onClick={handleWake}
              disabled={waking}
            >
              {waking ? "Waking services…" : "Services asleep? Wake them"}
            </button>
            {wakeStatus && (
              <p
                className="lg-wake-status"
                data-testid="wake-status"
                role="status"
              >
                {wakeStatus}
              </p>
            )}
          </div>

          <p className="lg-foot">
            New here? <Link to="/register">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
