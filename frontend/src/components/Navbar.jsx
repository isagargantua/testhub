import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import HelpModal from "./HelpModal";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
      <div className="border-b border-[rgba(80,67,43,0.08)] bg-[rgba(255,251,245,0.52)] px-4 py-4 backdrop-blur-md md:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="eyebrow">Control room</div>
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

          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border border-[rgba(80,67,43,0.1)] bg-white/65 px-4 py-2 text-sm text-[#57483a] shadow-sm md:block">
              Session active
            </div>
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
