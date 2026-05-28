import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// The interactive Swagger docs are served by the gateway (same host as the
// API), not the frontend. VITE_API_URL points at the gateway, so /docs hangs
// off it. Falls back to localhost for local dev.
const apiUrl = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/$/, "");
const docsUrl = `${apiUrl}/docs`;

export default function Sidebar() {
  const { user } = useAuth();

  const navigation = [
    {
      to: "/",
      label: "Dashboard",
      meta: "overview",
    },
    {
      to: "/projects",
      label: "Projects",
      meta: "workspaces",
    },
    ...(user?.role === "ADMIN"
      ? [
          {
            to: "/users",
            label: "Users",
            meta: "admin",
          },
          {
            href: docsUrl,
            external: true,
            label: "API Docs",
            meta: "swagger",
          },
        ]
      : []),
  ];

  return (
    <aside className="w-full lg:w-[260px] bg-[#0f172a] text-white p-5 lg:p-6 lg:min-h-screen border-r border-white/10 flex flex-col">
      {/* Brand */}
      <div className="px-2 mb-6">
        <div className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-slate-400">
          TestHub
        </div>
        <div className="mt-1 text-xs text-slate-500">Test Management</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {navigation.map((item) =>
          item.external ? (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition duration-150 text-slate-300 hover:bg-white/[0.06] hover:text-white"
            >
              <div>
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  {item.label}
                  <span aria-hidden className="text-[0.7rem] text-slate-500">
                    &#8599;
                  </span>
                </div>
                <div className="mt-0.5 text-[0.65rem] uppercase tracking-[0.20em] text-slate-500">
                  {item.meta}
                </div>
              </div>
            </a>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition duration-150 ${
                  isActive
                    ? "bg-[#4f46e5] text-white"
                    : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div>
                    <div className="text-sm font-semibold">{item.label}</div>
                    <div
                      className={`mt-0.5 text-[0.65rem] uppercase tracking-[0.20em] ${
                        isActive ? "text-indigo-200" : "text-slate-500"
                      }`}
                    >
                      {item.meta}
                    </div>
                  </div>
                </>
              )}
            </NavLink>
          )
        )}
      </nav>

      {/* User card */}
      {user && (
        <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
          <div className="text-sm font-semibold text-slate-200 truncate">
            {user.name}
          </div>
          <div className="mt-0.5 text-[0.65rem] uppercase tracking-[0.20em] text-slate-500">
            {user.role}
          </div>
        </div>
      )}
    </aside>
  );
}
