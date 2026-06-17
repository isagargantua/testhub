// Friendly empty state — a single sleepy goggle-buddy (matching the login
// mascots) plus a title, description, and optional action.

function SleepyBuddy() {
  return (
    <svg
      width="132"
      height="132"
      viewBox="0 0 132 132"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="es-buddy"
    >
      <defs>
        <linearGradient id="esBody" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#8f90ff" />
          <stop offset="1" stopColor="#5a48e6" />
        </linearGradient>
        <linearGradient id="esStrap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#41454d" />
          <stop offset="1" stopColor="#1b1d22" />
        </linearGradient>
      </defs>

      {/* shadow */}
      <ellipse cx="66" cy="120" rx="34" ry="7" fill="rgba(20,17,30,0.14)" />

      {/* zzz */}
      <g className="es-zzz" fill="#9a93cf" fontFamily="Fraunces, Georgia, serif" fontWeight="700">
        <text x="92" y="40" fontSize="13">z</text>
        <text x="100" y="30" fontSize="16">z</text>
        <text x="110" y="19" fontSize="20">z</text>
      </g>

      {/* feet */}
      <ellipse cx="54" cy="112" rx="9" ry="6" fill="#211b16" />
      <ellipse cx="78" cy="112" rx="9" ry="6" fill="#211b16" />

      {/* body */}
      <rect x="34" y="28" width="64" height="84" rx="32" fill="url(#esBody)" />

      {/* goggle strap */}
      <rect x="30" y="52" width="72" height="26" rx="13" fill="url(#esStrap)" />

      {/* lenses */}
      <circle cx="54" cy="65" r="15" fill="#aeb7c2" />
      <circle cx="54" cy="65" r="11" fill="#eef6fb" />
      <circle cx="78" cy="65" r="15" fill="#aeb7c2" />
      <circle cx="78" cy="65" r="11" fill="#eef6fb" />

      {/* closed (sleeping) eyes */}
      <path d="M 47 65 Q 54 71 61 65" stroke="#1b1620" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M 71 65 Q 78 71 85 65" stroke="#1b1620" strokeWidth="3" strokeLinecap="round" fill="none" />

      {/* calm mouth */}
      <path d="M 60 90 q 6 5 12 0" stroke="#2a1d16" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default function EmptyState({ title, description, children }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <SleepyBuddy />
      <div>
        <h3 className="display-title text-2xl text-[#2f2419]">{title}</h3>
        {description && (
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#8a7a69]">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
