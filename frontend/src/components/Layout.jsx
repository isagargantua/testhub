import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function Layout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Prevent body scroll while the mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileNavOpen]);

  return (
    <div className="page-shell premium-grid lg:p-5">
      <div className="app-panel min-h-screen rounded-none lg:rounded-[32px] flex overflow-hidden">
        <Sidebar
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
        />
        <div className="flex-1 min-w-0">
          <Navbar onMobileMenuOpen={() => setMobileNavOpen(true)} />
          <div className="p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
