import { forwardRef, useEffect, useRef, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { wakeServices } from "../api/warmup";
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
  const [celebrate, setCelebrate] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [waking, setWaking] = useState(false);
  const [wakeStatus, setWakeStatus] = useState("");

  const sceneRef = useRef(null);
  const emailRef = useRef(null);
  const pwRef = useRef(null);
  const lastMouse = useRef({ x: null, y: null });

  const emailActive = emailFocused || emailHover;
  const pwActive = pwFocused || pwHover;

  // Where the buddies look / how they feel (success + fail win over the rest).
  const mode = celebrate
    ? "celebrate"
    : failed
    ? "fail"
    : pwActive && showPassword
    ? "away" // password is exposed → look away and pretend not to watch
    : pwActive
    ? "password" // hidden password → peek at the field
    : emailActive
    ? "email" // peek at the email field
    : "cursor";

  // ---- smooth eased pupil tracking ----
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const pupils = [...scene.querySelectorAll(".lg-pupil")].map((g) => {
      const eye = g.closest(".lg-eye");
      return {
        g,
        anchor: eye.querySelector(".lg-anchor"),
        max: Number(eye.dataset.max) || 6,
        curX: 0,
        curY: 0,
        tgX: 0,
        tgY: 0,
      };
    });

    function setTargets(tx, ty) {
      pupils.forEach((p) => {
        const r = p.anchor.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const angle = Math.atan2(ty - cy, tx - cx);
        const reach = Math.min(1, Math.hypot(tx - cx, ty - cy) / 240);
        p.tgX = Math.cos(angle) * p.max * reach;
        p.tgY = Math.sin(angle) * p.max * reach;
      });
    }
    function aimAhead() {
      pupils.forEach((p) => {
        p.tgX = 0;
        p.tgY = 0;
      });
    }

    scene.__setTargets = setTargets;
    scene.__aimAhead = aimAhead;

    let raf = 0;
    function loop() {
      pupils.forEach((p) => {
        p.curX += (p.tgX - p.curX) * 0.16;
        p.curY += (p.tgY - p.curY) * 0.16;
        p.g.setAttribute(
          "transform",
          `translate(${p.curX.toFixed(2)} ${p.curY.toFixed(2)})`
        );
      });
      raf = requestAnimationFrame(loop);
    }
    loop();

    function onMove(e) {
      lastMouse.current = { x: e.clientX, y: e.clientY };
      if (sceneRef.current?.dataset.mode === "cursor")
        setTargets(e.clientX, e.clientY);
    }
    window.addEventListener("mousemove", onMove);

    let blinkTimer = 0;
    function scheduleBlink() {
      blinkTimer = window.setTimeout(() => {
        scene.classList.add("blink");
        window.setTimeout(() => scene.classList.remove("blink"), 150);
        scheduleBlink();
      }, 2600 + Math.random() * 3200);
    }
    scheduleBlink();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      clearTimeout(blinkTimer);
    };
  }, []);

  // Re-aim whenever the mode changes. In "away" they stare off to the side but
  // sneak the occasional guilty glance back at the password field.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !scene.__setTargets) return;
    scene.dataset.mode = mode;

    const center = (el) => {
      const r = el.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    };
    const awayPoint = () => {
      const r = scene.getBoundingClientRect();
      return [r.left - 600, r.top + r.height * 0.55];
    };

    let glanceTimer = 0;

    if (mode === "email" && emailRef.current) {
      scene.__setTargets(...center(emailRef.current));
    } else if (mode === "password" && pwRef.current) {
      scene.__setTargets(...center(pwRef.current));
    } else if (mode === "away") {
      scene.__setTargets(...awayPoint());
      glanceTimer = window.setInterval(() => {
        if (pwRef.current) scene.__setTargets(...center(pwRef.current)); // peek
        window.setTimeout(() => {
          if (sceneRef.current?.dataset.mode === "away")
            scene.__setTargets(...awayPoint()); // back to looking away
        }, 460);
      }, 2000);
    } else if (mode === "fail" || mode === "celebrate") {
      scene.__aimAhead();
    } else {
      const { x, y } = lastMouse.current;
      if (x != null) scene.__setTargets(x, y);
      else scene.__aimAhead();
    }

    return () => {
      if (glanceTimer) clearInterval(glanceTimer);
    };
  }, [mode]);

  // Keep peeking at the live caret as the user types.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !scene.__setTargets) return;
    const el =
      mode === "email"
        ? emailRef.current
        : mode === "password"
        ? pwRef.current
        : null;
    if (el) {
      const r = el.getBoundingClientRect();
      scene.__setTargets(r.left + r.width / 2, r.top + r.height / 2);
    }
  }, [email, password]);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError("");
      setFailed(false);
      setSubmitting(true);
      await login(email.trim(), password);
      setCelebrate(true);
      window.setTimeout(() => navigate("/"), 850);
    } catch (err) {
      setError(getErrorMessage(err));
      setFailed(true);
      window.setTimeout(() => setFailed(false), 1500);
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

  const sceneClass = [
    `m-${mode}`,
    mode === "away" ? "is-away" : "",
    mode === "fail" ? "is-fail" : "",
    mode === "celebrate" ? "is-celebrate" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="lg-root">
      <div className="lg-art">
        <div className="lg-grain" aria-hidden="true" />
        <div className="lg-brand">
          <Spark />
          <span>TestHub</span>
        </div>

        <div className="lg-stage" aria-hidden="true">
          <Scene ref={sceneRef} className={sceneClass} />
        </div>

        <p className="lg-tagline" aria-hidden="true">
          Four pairs of goggles. Always watching.
        </p>
      </div>

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

/* ============================================================
   Original goggle-buddies — four capsule mascots, hand-built in
   SVG. (Not the trademarked Minions; distinct colours, goggles
   and proportions.) Layered groups keep motion independent:
   .lg-actor (entrance + lean) › .lg-bob (breathe) › .lg-head
   (nods "no" on a failed login, feet stay planted).
   ============================================================ */

function Eye({ cx, cy, r, max, dot = false, bare = false }) {
  const showSclera = !dot && !bare;
  const pr = dot ? r : r * 0.5;
  return (
    <g className="lg-eye" data-max={max}>
      <circle className="lg-anchor" cx={cx} cy={cy} r="0.5" fill="none" />
      <g className="lg-open">
        {showSclera && <circle className="lg-sclera" cx={cx} cy={cy} r={r} />}
        <g className="lg-pupil">
          <circle className="lg-pupil-dot" cx={cx} cy={cy} r={pr} />
          <circle
            className="lg-glint"
            cx={cx - pr * 0.55}
            cy={cy - pr * 0.6}
            r={pr * 0.4}
          />
        </g>
      </g>
      <path
        className="lg-closed"
        d={`M ${cx - r} ${cy - 1} Q ${cx} ${cy + r * 0.9} ${cx + r} ${cy - 1}`}
      />
    </g>
  );
}

function Buddy({ cls, grad, x, w, top, eyeY, lenses, hair = 1 }) {
  const foot = 466;
  const cx = x + w / 2;
  const big = lenses === 1;
  const rimR = big ? 42 : 30;
  const lensR = big ? 32 : 22;
  const off = 32;
  const centers = big
    ? [[cx, eyeY]]
    : [
        [cx - off, eyeY],
        [cx + off, eyeY],
      ];
  const max = lensR * 0.42;
  const mouthY = eyeY + rimR + 16;
  const armY = eyeY + rimR + 26;
  const hairs = Array.from({ length: hair });

  return (
    <g className={`lg-actor ${cls}`}>
      <g className="lg-bob">
        {/* feet stay planted while the head nods */}
        <ellipse className="lg-feet" cx={cx - w * 0.2} cy={foot + 6} rx={w * 0.17} ry={11} />
        <ellipse className="lg-feet" cx={cx + w * 0.2} cy={foot + 6} rx={w * 0.17} ry={11} />

        <g className="lg-head">
          {/* arms */}
          <path
            className="lg-arm lg-arm-l"
            d={`M ${x + 12} ${armY} q -16 12 -12 42`}
            fill="none"
            stroke={`url(#${grad})`}
            strokeWidth="18"
            strokeLinecap="round"
          />
          <path
            className="lg-arm lg-arm-r"
            d={`M ${x + w - 12} ${armY} q 16 12 12 42`}
            fill="none"
            stroke={`url(#${grad})`}
            strokeWidth="18"
            strokeLinecap="round"
          />

          {/* body */}
          <rect
            className="lg-body"
            x={x}
            y={top}
            width={w}
            height={foot - top}
            rx={w / 2}
            fill={`url(#${grad})`}
            filter="url(#lgSoft)"
          />
          <ellipse
            className="lg-sheen"
            cx={cx - w * 0.2}
            cy={top + w * 0.42}
            rx={w * 0.15}
            ry={w * 0.26}
          />

          {/* hair */}
          <g className="lg-hair">
            {hairs.map((_, i) => {
              const hx = cx + (i - (hair - 1) / 2) * 12;
              return (
                <path
                  key={i}
                  d={`M ${hx} ${top + 6} q ${i % 2 ? 8 : -8} -14 ${
                    i % 2 ? 3 : -3
                  } -26`}
                />
              );
            })}
          </g>

          {/* goggle strap */}
          <rect
            className="lg-strap"
            x={x - 7}
            y={eyeY - rimR + 2}
            width={w + 14}
            height={rimR * 2 - 6}
            rx={rimR - 4}
            fill="url(#gStrap)"
          />

          {/* lenses + eyes */}
          {centers.map(([lx, ly], i) => (
            <g className="lg-lens" key={i}>
              <circle className="lg-rim" cx={lx} cy={ly} r={rimR} fill="url(#gChrome)" />
              <circle className="lg-lenswhite" cx={lx} cy={ly} r={lensR} />
              <Eye cx={lx} cy={ly} r={lensR} max={max} bare />
            </g>
          ))}

          {/* mouth */}
          <g className="lg-mouth">
            <path
              className="m-default"
              d={`M ${cx - 12} ${mouthY} q 12 9 24 0`}
              fill="none"
              stroke="#2a1d16"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              className="m-smile"
              d={`M ${cx - 15} ${mouthY} q 15 17 30 0 q -15 9 -30 0 Z`}
              fill="#2a1d16"
              stroke="none"
            />
            <path
              className="m-frown"
              d={`M ${cx - 12} ${mouthY + 5} q 12 -9 24 0`}
              fill="none"
              stroke="#2a1d16"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>
        </g>
      </g>
    </g>
  );
}

const CAST = [
  { cls: "b-teal", grad: "gTeal", x: 71, w: 124, top: 150, eyeY: 232, lenses: 2, hair: 2 },
  { cls: "b-coral", grad: "gCoral", x: 203, w: 140, top: 300, eyeY: 364, lenses: 1, hair: 1 },
  { cls: "b-amber", grad: "gAmber", x: 343, w: 120, top: 235, eyeY: 308, lenses: 2, hair: 3 },
  { cls: "b-peri", grad: "gPeri", x: 457, w: 132, top: 200, eyeY: 274, lenses: 1, hair: 2 },
];

const Scene = forwardRef(function Scene({ className = "" }, ref) {
  return (
    <svg
      ref={ref}
      className={`lg-scene ${className}`.trim()}
      viewBox="0 0 660 520"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="gTeal" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#34d6c1" />
          <stop offset="1" stopColor="#12a08f" />
        </linearGradient>
        <linearGradient id="gCoral" x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0" stopColor="#ff8e78" />
          <stop offset="1" stopColor="#ef553b" />
        </linearGradient>
        <linearGradient id="gAmber" x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0" stopColor="#ffd35e" />
          <stop offset="1" stopColor="#f3a008" />
        </linearGradient>
        <linearGradient id="gPeri" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#8f90ff" />
          <stop offset="1" stopColor="#5a48e6" />
        </linearGradient>
        <linearGradient id="gStrap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#41454d" />
          <stop offset="1" stopColor="#1b1d22" />
        </linearGradient>
        <linearGradient id="gChrome" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#f6f9fc" />
          <stop offset="1" stopColor="#aeb7c2" />
        </linearGradient>
        <radialGradient id="gShadow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(20,17,30,0.3)" />
          <stop offset="1" stopColor="rgba(20,17,30,0)" />
        </radialGradient>
        <filter id="lgSoft" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="12" stdDeviation="14" floodColor="#170f24" floodOpacity="0.2" />
        </filter>
      </defs>

      <g className="lg-shadows">
        {CAST.map((c) => (
          <ellipse
            key={c.cls}
            cx={c.x + c.w / 2}
            cy={488}
            rx={c.w * 0.62}
            ry={20}
            fill="url(#gShadow)"
          />
        ))}
      </g>

      {/* back to front */}
      <Buddy {...CAST[0]} />
      <Buddy {...CAST[3]} />
      <Buddy {...CAST[2]} />
      <Buddy {...CAST[1]} />

      <g className="lg-sparkles">
        {[
          [120, 150],
          [300, 250],
          [400, 200],
          [523, 195],
          [220, 300],
        ].map(([x, y], i) => (
          <path
            key={i}
            className={`lg-spark s${i}`}
            d={`M${x} ${y - 11} C ${x + 2} ${y - 3} ${x + 3} ${y - 2} ${
              x + 11
            } ${y} C ${x + 3} ${y + 2} ${x + 2} ${y + 3} ${x} ${y + 11} C ${
              x - 2
            } ${y + 3} ${x - 3} ${y + 2} ${x - 11} ${y} C ${x - 3} ${
              y - 2
            } ${x - 2} ${y - 3} ${x} ${y - 11} Z`}
            fill="#ffffff"
          />
        ))}
      </g>
    </svg>
  );
});

/* Brand spark / 4-point sparkle */
function Spark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 0c.6 6 5.4 10.8 12 12-6.6 1.2-11.4 6-12 12-.6-6-5.4-10.8-12-12C6.6 10.8 11.4 6 12 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12A3 3 0 1 1 9.88 9.88" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
