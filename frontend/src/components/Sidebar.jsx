import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
        ]
      : []),
  ];

  return (
    <aside className="w-full lg:w-[290px] bg-[#1d2431] text-[#f7f1e8] p-5 lg:p-6 lg:min-h-screen border-r border-white/10">
      <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-md">
        <div className="eyebrow text-[#e9d9c6]">TestHub</div>
        <h1 className="display-title mt-3 text-4xl leading-none">
          Automation
          <br />
          Studio
        </h1>
        <p className="mt-4 text-sm leading-6 text-[#d9ccbc]">
          A crafted workspace for API and automation runs, built to feel calm,
          sharp, and dependable.
        </p>
      </div>

      <nav className="mt-6 space-y-3">
        {navigation.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block rounded-[22px] border px-4 py-4 transition duration-200 ${
                isActive
                  ? "border-[#d88b53]/60 bg-gradient-to-r from-[#d17a43] to-[#b96534] text-white shadow-xl"
                  : "border-white/10 bg-white/5 text-[#f7f1e8] hover:border-white/20 hover:bg-white/10"
              }`
            }
          >
            {({ isActive }) => (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{item.label}</div>
                  <div
                    className={`mt-1 text-xs uppercase tracking-[0.22em] ${
                      isActive ? "text-white/70" : "text-[#cdbca9]"
                    }`}
                  >
                    {item.meta}
                  </div>
                </div>
                <div
                  className={`h-10 w-10 rounded-full border flex items-center justify-center text-xs uppercase tracking-[0.22em] ${
                    isActive
                      ? "border-white/25 bg-white/10"
                      : "border-white/10 bg-black/10"
                  }`}
                >
                  {item.label.slice(0, 2)}
                </div>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-6 rounded-[24px] border border-white/10 bg-black/10 p-5 text-[#decebc]">
        <div className="eyebrow text-[#e2cfb7]">Why this works</div>
        <p className="mt-3 text-sm leading-6">
          Keep the user pool lean, reuse accounts, and focus on repeatable
          automation flows instead of account sprawl.
        </p>
        <div className="mt-4 flex items-center justify-between rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm">
          <span>Recommended pool</span>
          <strong className="text-[#fff2df]">50 to 100</strong>
        </div>
      </div>
    </aside>
  );
}
