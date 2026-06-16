import { useMemo, useRef, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
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

  return "Could not create account. Please try again.";
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [hoveredField, setHoveredField] = useState(null);
  const [failed, setFailed] = useState(false);
  const [failLevel, setFailLevel] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const pwRef = useRef(null);
  const confirmRef = useRef(null);
  const capsOn = useCapsLock();

  const validationError = useMemo(() => {
    if (!name.trim()) return "Name is required.";
    if (!email.trim()) return "Email is required.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (password !== confirmPassword) return "Passwords do not match.";
    return "";
  }, [name, email, password, confirmPassword]);

  const activeField = focusedField || hoveredField;
  const mismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  const mode = celebrate
    ? "celebrate"
    : failed
    ? "fail"
    : activeField === "password" && showPassword
    ? "away"
    : activeField || "cursor";

  const refs = { name: nameRef, email: emailRef, password: pwRef, confirm: confirmRef };
  const values = { name, email, password, confirm: confirmPassword };
  const watchRef = mode === "away" ? pwRef : refs[activeField] || null;
  const watchKey = values[activeField] || "";
  const strengthClass =
    mode === "password" && password.length > 0
      ? strengthToClass(scorePassword(password))
      : "";
  const capsActive =
    (activeField === "password" || activeField === "confirm") && capsOn;

  function triggerFail() {
    setFailLevel((level) => level + 1);
    setFailed(true);
    window.setTimeout(() => setFailed(false), 1800);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (validationError) {
      setError(validationError);
      triggerFail();
      return;
    }

    try {
      setError("");
      setFailed(false);
      setSubmitting(true);
      await register(name.trim(), email.trim(), password);
      setFailLevel(0);
      setCelebrate(true);
      window.setTimeout(() => navigate("/"), 850);
    } catch (err) {
      setError(getErrorMessage(err));
      triggerFail();
    } finally {
      setSubmitting(false);
    }
  }

  const fieldHandlers = (field) => ({
    onFocus: () => setFocusedField(field),
    onBlur: () => setFocusedField((f) => (f === field ? null : f)),
  });
  const rowHandlers = (field) => ({
    onMouseEnter: () => setHoveredField(field),
    onMouseLeave: () => setHoveredField((f) => (f === field ? null : f)),
  });

  return (
    <div className="lg-root">
      <MascotStage
        mode={mode}
        watchRef={watchRef}
        watchKey={watchKey}
        failed={failed}
        failLevel={failLevel}
        celebrate={celebrate}
        capsActive={capsActive}
        strengthClass={strengthClass}
        worried={mismatch && !celebrate && !failed}
        tagline="Set up your QA workspace in minutes."
      />

      <div className="lg-form-wrap">
        <div className="lg-form">
          <div className="lg-logo">
            <Spark />
          </div>

          <h1 className="lg-title">Create your account</h1>
          <p className="lg-subtitle">Start managing your QA workspace.</p>

          {error && (
            <div className="lg-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="lg-field">
              <label className="lg-label" htmlFor="register-name">
                Name
              </label>
              <div className="lg-input-row" {...rowHandlers("name")}>
                <input
                  id="register-name"
                  ref={nameRef}
                  type="text"
                  className="lg-input"
                  data-testid="register-name"
                  value={name}
                  autoComplete="name"
                  placeholder="QA Lead"
                  {...fieldHandlers("name")}
                  onChange={(e) => setName(e.target.value)}
                />
                <span className="lg-underline" />
              </div>
            </div>

            <div className="lg-field">
              <label className="lg-label" htmlFor="register-email">
                Email
              </label>
              <div className="lg-input-row" {...rowHandlers("email")}>
                <input
                  id="register-email"
                  ref={emailRef}
                  type="email"
                  className="lg-input"
                  data-testid="register-email"
                  value={email}
                  autoComplete="email"
                  placeholder="qa@company.com"
                  {...fieldHandlers("email")}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <span className="lg-underline" />
              </div>
            </div>

            <div className="lg-field">
              <label className="lg-label" htmlFor="register-password">
                Password
              </label>
              <div className="lg-input-row" {...rowHandlers("password")}>
                <input
                  id="register-password"
                  ref={pwRef}
                  type={showPassword ? "text" : "password"}
                  className="lg-input"
                  data-testid="register-password"
                  value={password}
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  {...fieldHandlers("password")}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <span className="lg-underline" />
                <button
                  type="button"
                  className="lg-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff /> : <EyeIcon />}
                </button>
              </div>
              {activeField === "password" && capsOn && (
                <p className="lg-caps-hint" role="status">
                  ⇪ Caps Lock is on
                </p>
              )}
            </div>

            <div className="lg-field">
              <label className="lg-label" htmlFor="register-confirm">
                Confirm password
              </label>
              <div className="lg-input-row" {...rowHandlers("confirm")}>
                <input
                  id="register-confirm"
                  ref={confirmRef}
                  type={showPassword ? "text" : "password"}
                  className="lg-input"
                  data-testid="register-confirm"
                  value={confirmPassword}
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  {...fieldHandlers("confirm")}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <span className="lg-underline" />
              </div>
              {mismatch && (
                <p className="lg-caps-hint" role="status">
                  Passwords don’t match yet
                </p>
              )}
              {activeField === "confirm" && capsOn && (
                <p className="lg-caps-hint" role="status">
                  ⇪ Caps Lock is on
                </p>
              )}
            </div>

            <button
              className={`lg-btn${celebrate ? " is-go" : ""}`}
              data-testid="register-submit"
              disabled={submitting || celebrate}
            >
              <span>
                {celebrate
                  ? "Welcome aboard ✦"
                  : submitting
                  ? "Creating account…"
                  : "Create account"}
              </span>
            </button>
          </form>

          <p className="lg-foot">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
