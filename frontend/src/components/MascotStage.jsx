import { forwardRef, useEffect, useRef, useState } from "react";

import { probeServices } from "../api/warmup";
import "../pages/Login.css";

/* ============================================================================
   Shared mascot stage — the left "art panel" with the four hand-built SVG
   goggle-buddies and their whole animation engine (pupil spring tracking,
   parallax, blink/wink, naps, idle behaviors, boop, mood reactions).

   Both the Login and Register pages render this; they own their own forms and
   just tell the stage which field is active + the auth state via props.
   ============================================================================ */

const FIELD_MODES = ["name", "email", "password", "confirm"];

// Lightweight password-strength heuristic (no dependency). 0–5.
export function scorePassword(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return score;
}

export function strengthToClass(score) {
  if (score < 0) return "";
  if (score <= 1) return "pw-weak";
  if (score <= 3) return "pw-med";
  return "pw-strong";
}

function timeOfDay(hour) {
  if (hour < 6) return "night";
  if (hour < 11) return "dawn";
  if (hour < 17) return "day";
  if (hour < 20) return "dusk";
  return "night";
}

// Shared caps-lock detector — pages use it for both the wide-eye cue and the
// inline hint by the password field.
export function useCapsLock() {
  const [capsOn, setCapsOn] = useState(false);
  useEffect(() => {
    const onKey = (e) => {
      if (typeof e.getModifierState === "function") {
        setCapsOn(e.getModifierState("CapsLock"));
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, []);
  return capsOn;
}

export default function MascotStage({
  mode = "cursor",
  watchRef,
  watchKey,
  failed = false,
  failLevel = 0,
  celebrate = false,
  capsActive = false,
  strengthClass = "",
  worried = false,
  wokeSignal = 0,
  tagline = "Manage projects, test cases, and runs in one secure workspace.",
}) {
  const sceneRef = useRef(null);
  const lastMouse = useRef({ x: null, y: null });

  const [asleep, setAsleep] = useState(false);
  const [woke, setWoke] = useState(false);
  const [idle, setIdle] = useState(false);
  const [tod] = useState(() => timeOfDay(new Date().getHours()));

  const interacting = FIELD_MODES.includes(mode) || mode === "away";
  const sleeping = asleep && idle && !interacting && !celebrate && !failed;

  // ---- pupil tracking (spring), parallax, blink + wink ----
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

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
        vX: 0,
        vY: 0,
      };
    });
    const depthEls = [...scene.querySelectorAll(".lg-depth")];
    const eyes = [...scene.querySelectorAll(".lg-eye")];

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
        if (reduce) {
          p.curX = p.tgX;
          p.curY = p.tgY;
        } else {
          p.vX = (p.vX + (p.tgX - p.curX) * 0.12) * 0.78;
          p.vY = (p.vY + (p.tgY - p.curY) * 0.12) * 0.78;
          p.curX += p.vX;
          p.curY += p.vY;
        }
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

      // Gentle parallax — front buddies drift a little more than back ones.
      // Kept small so the group never visibly separates.
      if (!reduce && depthEls.length) {
        const r = scene.getBoundingClientRect();
        const dx = Math.max(
          -1,
          Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2))
        );
        const dy = Math.max(
          -1,
          Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2))
        );
        depthEls.forEach((el) => {
          const d = Number(el.dataset.depth) || 0;
          el.setAttribute(
            "transform",
            `translate(${(-dx * d * 8).toFixed(2)} ${(-dy * d * 5).toFixed(2)})`
          );
        });
      }
    }
    window.addEventListener("mousemove", onMove);

    let blinkTimer = 0;
    function scheduleBlink() {
      blinkTimer = window.setTimeout(() => {
        if (Math.random() < 0.32 && eyes.length) {
          const eye = eyes[Math.floor(Math.random() * eyes.length)];
          eye.classList.add("winking");
          window.setTimeout(() => eye.classList.remove("winking"), 220);
        } else {
          scene.classList.add("blink");
          window.setTimeout(() => scene.classList.remove("blink"), 150);
        }
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

  // Re-aim on mode change. Field modes peek at the active input; "away" stares
  // off but sneaks glances back at it.
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

    if (FIELD_MODES.includes(mode) && watchRef?.current) {
      scene.__setTargets(...center(watchRef.current));
    } else if (mode === "away") {
      scene.__setTargets(...awayPoint());
      glanceTimer = window.setInterval(() => {
        if (watchRef?.current) scene.__setTargets(...center(watchRef.current));
        window.setTimeout(() => {
          if (sceneRef.current?.dataset.mode === "away")
            scene.__setTargets(...awayPoint());
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
  }, [mode, watchRef]);

  // Follow the live caret as the user types in the active field.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !scene.__setTargets) return;
    if (FIELD_MODES.includes(mode) && watchRef?.current) {
      const r = watchRef.current.getBoundingClientRect();
      scene.__setTargets(r.left + r.width / 2, r.top + r.height / 2);
    }
  }, [watchKey, mode, watchRef]);

  // Probe whether the free-tier backend is awake; if asleep, buddies nap.
  useEffect(() => {
    let cancelled = false;
    probeServices({ timeoutMs: 8000 })
      .then(({ allAwake }) => {
        if (!cancelled) setAsleep(!allAwake);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Parent bumps wokeSignal (e.g. after "Wake them") to rouse + stretch.
  useEffect(() => {
    if (wokeSignal > 0) {
      setAsleep(false);
      setWoke(true);
      const t = window.setTimeout(() => setWoke(false), 1000);
      return () => window.clearTimeout(t);
    }
  }, [wokeSignal]);

  // Track activity → naps + idle micro-behaviors.
  useEffect(() => {
    let timer = 0;
    const markActive = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), 8000);
    };
    const events = ["mousemove", "keydown", "mousedown", "touchstart"];
    events.forEach((e) =>
      window.addEventListener(e, markActive, { passive: true })
    );
    markActive();
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, markActive));
    };
  }, []);

  // Idle and awake → a buddy yawns or glances around.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !idle || sleeping) return;

    const actors = [...scene.querySelectorAll(".lg-actor")];
    const id = window.setInterval(() => {
      if (Math.random() < 0.5 && actors.length) {
        const a = actors[Math.floor(Math.random() * actors.length)];
        a.classList.add("yawning");
        window.setTimeout(() => a.classList.remove("yawning"), 1400);
      } else if (scene.__setTargets) {
        const r = scene.getBoundingClientRect();
        const side = Math.random() < 0.5 ? -1 : 1;
        scene.__setTargets(r.left + r.width / 2 + side * 300, r.top + r.height * 0.4);
        window.setTimeout(() => {
          if (scene.__aimAhead && sceneRef.current?.dataset.mode === "cursor")
            scene.__aimAhead();
        }, 900);
      }
    }, 3500);

    return () => window.clearInterval(id);
  }, [idle, sleeping]);

  function handleBoop(e) {
    const actor = e.currentTarget;
    actor.classList.remove("booped");
    void actor.getBoundingClientRect();
    actor.classList.add("booped");
    window.setTimeout(() => actor.classList.remove("booped"), 620);
  }

  const sceneClass = [
    `m-${mode}`,
    mode === "away" ? "is-away" : "",
    mode === "fail" ? "is-fail" : "",
    mode === "celebrate" ? "is-celebrate" : "",
    sleeping ? "is-sleeping" : "",
    woke ? "is-waking" : "",
    capsActive ? "is-caps" : "",
    failed && failLevel >= 2 ? "is-cringe" : "",
    worried ? "is-worried" : "",
    strengthClass,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`lg-art tod-${tod}`}>
      <div className="lg-grain" aria-hidden="true" />
      <div className="lg-brand">
        <Spark />
        <span>TestHub</span>
      </div>

      <div className="lg-stage" aria-hidden="true">
        <Scene ref={sceneRef} className={sceneClass} onBoop={handleBoop} />
      </div>

      <p className="lg-tagline" aria-hidden="true">
        {tagline}
      </p>
    </div>
  );
}

/* ============================================================
   Original goggle-buddies — four capsule mascots, hand-built in
   SVG. Layered groups keep motion independent: .lg-depth (mouse
   parallax) › .lg-actor (entrance + lean) › .lg-bob (breathe/
   boop) › .lg-head (reacts on fail; feet stay planted).
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

function Buddy({
  cls,
  grad,
  x,
  w,
  top,
  eyeY,
  lenses,
  hair = 1,
  hairColors,
  depth = 0,
  onBoop,
}) {
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
    <g className="lg-depth" data-depth={depth}>
      <g className={`lg-actor ${cls}`} onClick={onBoop} role="presentation">
        <g className="lg-bob">
          {/* feet stay planted while the head reacts */}
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

            {/* hair — per-strand colour via hairColors, else inherits the
                default dark stroke from CSS */}
            <g className="lg-hair">
              {hairs.map((_, i) => {
                const hx = cx + (i - (hair - 1) / 2) * 12;
                return (
                  <path
                    key={i}
                    stroke={hairColors ? hairColors[i % hairColors.length] : undefined}
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
              <ellipse
                className="m-yawn"
                cx={cx}
                cy={mouthY + 2}
                rx="7"
                ry="9"
                fill="#2a1d16"
              />
            </g>
          </g>
        </g>
      </g>
    </g>
  );
}

// Light green + blue strands for the two front-centre buddies (coral & amber).
const HAIR_GREEN_BLUE = ["#86efac", "#60a5fa"];

// Tightened spacing so the (tall) teal buddy groups with the others instead of
// drifting off to the left.
const CAST = [
  { cls: "b-teal", grad: "gTeal", x: 120, w: 124, top: 150, eyeY: 232, lenses: 2, hair: 2, depth: 0.5 },
  { cls: "b-coral", grad: "gCoral", x: 226, w: 140, top: 300, eyeY: 364, lenses: 1, hair: 2, hairColors: HAIR_GREEN_BLUE, depth: 1 },
  { cls: "b-amber", grad: "gAmber", x: 356, w: 120, top: 235, eyeY: 308, lenses: 2, hair: 2, hairColors: HAIR_GREEN_BLUE, depth: 0.8 },
  { cls: "b-peri", grad: "gPeri", x: 462, w: 132, top: 200, eyeY: 274, lenses: 1, hair: 2, depth: 0.65 },
];

const Scene = forwardRef(function Scene({ className = "", onBoop }, ref) {
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
      <Buddy {...CAST[0]} onBoop={onBoop} />
      <Buddy {...CAST[3]} onBoop={onBoop} />
      <Buddy {...CAST[2]} onBoop={onBoop} />
      <Buddy {...CAST[1]} onBoop={onBoop} />

      {/* sleepy Zzz (shown only while napping) */}
      <g className="lg-zzz" aria-hidden="true">
        <text className="z z0" x="190" y="150" fontSize="22">z</text>
        <text className="z z1" x="206" y="134" fontSize="28">z</text>
        <text className="z z2" x="226" y="116" fontSize="34">z</text>
      </g>

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
export function Spark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 0c.6 6 5.4 10.8 12 12-6.6 1.2-11.4 6-12 12-.6-6-5.4-10.8-12-12C6.6 10.8 11.4 6 12 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOff() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12A3 3 0 1 1 9.88 9.88" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
