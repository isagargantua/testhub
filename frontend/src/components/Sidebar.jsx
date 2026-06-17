import { useCallback, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { probeServices, wakeServices } from "../api/warmup";

const apiUrl = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/$/, "");
const docsUrl = `${apiUrl}/docs`;

const COLLAPSE_KEY = "sidebar-collapsed";

const icon = (paths) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="flex-shrink-0"
  >
    {paths}
  </svg>
);

const ICONS = {
  dashboard: icon(
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </>
  ),
  projects: icon(
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  ),
  users: icon(
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  docs: icon(
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </>
  ),
  dump: icon(
    <>
      <path d="M21 8v13H3V8" />
      <path d="M1 3h22v5H1z" />
      <path d="M10 12h4" />
    </>
  ),
  testcases: icon(
    <>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <path d="M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2 2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2z" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="12" y2="16" />
    </>
  ),
  collapse: icon(
    <>
      <path d="M11 17l-5-5 5-5" />
      <path d="M18 17l-5-5 5-5" />
    </>
  ),
  expand: icon(
    <>
      <path d="M13 17l5-5-5-5" />
      <path d="M6 17l5-5-5-5" />
    </>
  ),
  close: icon(
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
};

const HEALTH = {
  checking:    { dot: "bg-slate-400 animate-pulse", label: "Checking…" },
  operational: { dot: "bg-emerald-400",             label: "Operational" },
  sleeping:    { dot: "bg-amber-400",               label: "Asleep / waking" },
};

export default function Sidebar({ mobileOpen, onMobileClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" &&
      window.localStorage.getItem(COLLAPSE_KEY) === "true"
  );
  const [health, setHealth] = useState("checking");
  const [waking, setWaking] = useState(false);

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      window.localStorage.setItem(COLLAPSE_KEY, String(next));
      return next;
    });
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  const checkHealth = useCallback(async () => {
    const { allAwake } = await probeServices({ timeoutMs: 8000 });
    setHealth(allAwake ? "operational" : "sleeping");
  }, []);

  useEffect(() => {
    checkHealth();
    const id = window.setInterval(checkHealth, 60000);
    return () => window.clearInterval(id);
  }, [checkHealth]);

  async function handleWake() {
    setWaking(true);
    setHealth("checking");
    const { allAwake } = await wakeServices();
    setHealth(allAwake ? "operational" : "sleeping");
    setWaking(false);
  }

  const navigation = [
    { to: "/",            label: "Dashboard",  meta: "overview",   icon: "dashboard"  },
    { to: "/projects",    label: "Projects",   meta: "workspaces", icon: "projects"   },
    { to: "/test-cases",  label: "Test Cases", meta: "library",    icon: "testcases"  },
    ...(user?.role === "ADMIN"
      ? [
          { to: "/users",                    label: "Users",    meta: "admin",   icon: "users" },
          { to: "/dump",                     label: "File Storage", meta: "storage", icon: "dump"  },
          { href: docsUrl, external: true,   label: "API Docs", meta: "swagger", icon: "docs"  },
        ]
      : []),
  ];

  const h = HEALTH[health];
  const initial = (user?.name || "?").trim().charAt(0).toUpperCase();
  const hideWhenCollapsed = collapsed ? "lg:hidden" : "";

  // ── Desktop sidebar ────────────────────────────────────────────────────────
  return (
    <>
      <aside
        className={`hidden lg:flex flex-col ${
          collapsed ? "lg:w-[78px]" : "lg:w-[260px]"
        } bg-[#0f172a] text-white p-5 h-full overflow-y-auto border-r border-white/10 transition-[width] duration-200`}
      >
        {/* Brand + collapse toggle */}
        <div className="flex items-center justify-between gap-2 px-2 mb-6">
          <div className={hideWhenCollapsed}>
            <div className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-slate-400">
              TestHub
            </div>
            <div className="mt-1 text-xs text-slate-500">Test Management</div>
          </div>
          <button
            onClick={toggle}
            className="flex items-center justify-center rounded-lg p-2 text-slate-300 hover:bg-white/[0.08] hover:text-white transition"
            title="Toggle sidebar (Ctrl/Cmd + B)"
            aria-label="Toggle sidebar"
          >
            {collapsed ? ICONS.expand : ICONS.collapse}
          </button>
        </div>

        {/* Nav */}
        <nav className="space-y-1">
          {navigation.map((item) =>
            item.external ? (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                title={item.label}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 transition duration-150 text-slate-300 hover:bg-white/[0.06] hover:text-white ${
                  collapsed ? "lg:justify-center" : ""
                }`}
              >
                {ICONS[item.icon]}
                <span className={hideWhenCollapsed}>
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    {item.label}
                    <span aria-hidden className="text-[0.7rem] text-slate-400">&#8599;</span>
                  </span>
                  <span className="block mt-0.5 text-[0.65rem] uppercase tracking-[0.20em] text-slate-400 group-hover:text-slate-200">
                    {item.meta}
                  </span>
                </span>
              </a>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                title={item.label}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-lg px-3 py-2.5 transition duration-150 ${
                    collapsed ? "lg:justify-center" : ""
                  } ${
                    isActive
                      ? "bg-[#4f46e5] text-white"
                      : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {ICONS[item.icon]}
                    <span className={hideWhenCollapsed}>
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span
                        className={`block mt-0.5 text-[0.65rem] uppercase tracking-[0.20em] ${
                          isActive ? "text-indigo-100" : "text-slate-400 group-hover:text-slate-200"
                        }`}
                      >
                        {item.meta}
                      </span>
                    </span>
                  </>
                )}
              </NavLink>
            )
          )}
        </nav>

        {/* Filler (expanded only) */}
        <div className={`mt-6 flex-1 flex flex-col gap-4 ${hideWhenCollapsed}`}>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
            <div className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-slate-500 mb-2">
              Quick actions
            </div>
            <button
              type="button"
              onClick={() => navigate("/projects")}
              className="w-full rounded-md bg-[#4f46e5] px-3 py-2 text-xs font-semibold text-white hover:bg-[#4338ca] transition"
            >
              + New Project
            </button>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
            <div className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-slate-500 mb-2">
              System status
            </div>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${h.dot}`} />
              <span className="text-sm text-slate-200">{h.label}</span>
            </div>
            <button
              type="button"
              onClick={handleWake}
              disabled={waking}
              className="mt-3 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/[0.08] transition disabled:opacity-60"
            >
              {waking ? "Waking…" : "Wake services"}
            </button>
          </div>

          <div className="px-2 text-[0.65rem] leading-relaxed text-slate-500">
            Tip: press{" "}
            <span className="rounded border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[0.6rem] text-slate-300">
              Ctrl/⌘ + B
            </span>{" "}
            to collapse this panel.
          </div>
        </div>

        {collapsed && <div className="flex-1" />}

        {user && (
          <div
            className={`mt-6 flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 ${
              collapsed ? "lg:justify-center lg:px-2" : ""
            }`}
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#4f46e5] text-sm font-semibold">
              {initial}
            </div>
            <div className={`min-w-0 ${hideWhenCollapsed}`}>
              <div className="truncate text-sm font-semibold text-slate-200">{user.name}</div>
              <div className="mt-0.5 text-[0.65rem] uppercase tracking-[0.20em] text-slate-500">{user.role}</div>
            </div>
          </div>
        )}
      </aside>

      {/* ── Mobile drawer ──────────────────────────────────────────────────── */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-200 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
          onClick={onMobileClose}
        />

        {/* Drawer */}
        <aside
          className={`absolute left-0 top-0 bottom-0 w-[280px] flex flex-col bg-[#0f172a] text-white p-5 overflow-y-auto border-r border-white/10 transition-transform duration-200 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Brand + close */}
          <div className="flex items-center justify-between gap-2 px-2 mb-6">
            <div>
              <div className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-slate-400">
                TestHub
              </div>
              <div className="mt-1 text-xs text-slate-500">Test Management</div>
            </div>
            <button
              onClick={onMobileClose}
              className="flex items-center justify-center rounded-lg p-2 text-slate-300 hover:bg-white/[0.08] hover:text-white transition"
              aria-label="Close menu"
            >
              {ICONS.close}
            </button>
          </div>

          {/* Nav */}
          <nav className="space-y-1">
            {navigation.map((item) =>
              item.external ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onMobileClose}
                  className="group flex items-center gap-3 rounded-lg px-3 py-3 transition duration-150 text-slate-300 hover:bg-white/[0.06] hover:text-white"
                >
                  {ICONS[item.icon]}
                  <span>
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      {item.label}
                      <span aria-hidden className="text-[0.7rem] text-slate-400">&#8599;</span>
                    </span>
                    <span className="block mt-0.5 text-[0.65rem] uppercase tracking-[0.20em] text-slate-400 group-hover:text-slate-200">
                      {item.meta}
                    </span>
                  </span>
                </a>
              ) : (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={onMobileClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-3 transition duration-150 ${
                      isActive
                        ? "bg-[#4f46e5] text-white"
                        : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {ICONS[item.icon]}
                      <span>
                        <span className="block text-sm font-semibold">{item.label}</span>
                        <span
                          className={`block mt-0.5 text-[0.65rem] uppercase tracking-[0.20em] ${
                            isActive ? "text-indigo-100" : "text-slate-400"
                          }`}
                        >
                          {item.meta}
                        </span>
                      </span>
                    </>
                  )}
                </NavLink>
              )
            )}
          </nav>

          {/* Status */}
          <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
            <div className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-slate-500 mb-2">
              System status
            </div>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${h.dot}`} />
              <span className="text-sm text-slate-200">{h.label}</span>
            </div>
            <button
              type="button"
              onClick={handleWake}
              disabled={waking}
              className="mt-3 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/[0.08] transition disabled:opacity-60"
            >
              {waking ? "Waking…" : "Wake services"}
            </button>
          </div>

          {/* User card */}
          {user && (
            <div className="mt-auto pt-6">
              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#4f46e5] text-sm font-semibold">
                  {initial}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-200">{user.name}</div>
                  <div className="mt-0.5 text-[0.65rem] uppercase tracking-[0.20em] text-slate-500">{user.role}</div>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
