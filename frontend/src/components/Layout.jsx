import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import CommandPalette from "./CommandPalette";

export default function Layout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  // Prevent body scroll while the mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileNavOpen]);

  return (
    <div className="page-shell premium-grid lg:p-5">
      <div className="app-panel rounded-none lg:rounded-[32px] flex overflow-hidden h-screen lg:h-[calc(100vh-2.5rem)]">
        <Sidebar
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
        />
        <div className="flex-1 min-w-0 flex flex-col">
          <Navbar
            onMobileMenuOpen={() => setMobileNavOpen(true)}
            scrolled={scrolled}
          />
          <main
            className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8"
            onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 4)}
          >
            <div key={location.pathname} className="route-fade">
              <Outlet />
            </div>
          </main>
        </div>
        <CommandPalette />
      </div>
    </div>
  );
}
