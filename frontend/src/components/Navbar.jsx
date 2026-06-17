import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import HelpModal from "./HelpModal";
import ThemeToggle from "./ThemeToggle";

function openCommandPalette() {
  // CommandPalette listens for ⌘K / Ctrl+K on window — dispatch it so the chip
  // works as a clickable affordance too.
  window.dispatchEvent(
    new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true })
  );
}

export default function Navbar({ onMobileMenuOpen, scrolled = false }) {
  const { user, logout } = useAuth();
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
      <div
        className={`glass-nav border-b border-[rgba(80,67,43,0.08)] bg-[rgba(255,251,245,0.52)] px-4 py-4 backdrop-blur-md md:px-6 lg:px-8 ${
          scrolled ? "is-scrolled" : ""
        }`}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            {/* Hamburger — mobile only */}
            <button
              onClick={onMobileMenuOpen}
              className="lg:hidden mt-1 flex-shrink-0 rounded-lg p-1.5 text-[#54473a] hover:bg-[rgba(80,67,43,0.08)] transition"
              aria-label="Open navigation"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <div>
              <div className="eyebrow">QA Workspace</div>
              <div className="mt-2 flex items-center gap-3">
                <h2 className="display-title text-3xl">Welcome back</h2>
                <span className="hidden rounded-full border border-[rgba(80,67,43,0.12)] bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#7b6a58] md:inline-flex">
                  {user?.role}
                </span>
              </div>
              <p className="mt-2 text-sm text-[#75675a]">
                {user?.name} is signed in and ready to orchestrate tests.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openCommandPalette}
              title="Quick jump (Ctrl/⌘ + K)"
              aria-label="Quick jump"
              className="hidden items-center justify-center rounded-full border border-[rgba(80,67,43,0.1)] bg-white/65 p-2.5 text-[#57483a] shadow-sm transition hover:bg-white md:inline-flex"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
            <ThemeToggle />
            <button
              onClick={() => setHelpOpen(true)}
              className="btn-secondary"
              title="User guide"
            >
              Help
            </button>
            <button onClick={logout} className="btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </div>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
