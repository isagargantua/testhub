import { useEffect, useRef, useState } from "react";

// Animated number that eases from its previous value to the new one. Falls back
// to an instant set when the user prefers reduced motion or the value isn't
// numeric.
export default function CountUp({ value, suffix = "", duration = 850 }) {
  const numeric = typeof value === "number" && Number.isFinite(value);
  const [display, setDisplay] = useState(numeric ? value : 0);
  const fromRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!numeric) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const to = value;
    const from = fromRef.current;

    if (reduce || from === to) {
      setDisplay(to);
      fromRef.current = to;
      return;
    }

    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration, numeric]);

  if (!numeric) return <>{value}</>;
  return (
    <>
      {display.toLocaleString()}
      {suffix}
    </>
  );
}
