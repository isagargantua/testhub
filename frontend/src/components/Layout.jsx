import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";

import Navbar from "./Navbar";

export default function Layout() {
  return (
    <div className="page-shell premium-grid lg:p-5">
      <div className="app-panel min-h-screen rounded-none lg:rounded-[32px] flex overflow-hidden">
      <Sidebar />

      <div className="flex-1 min-w-0">
        <Navbar />

        <div className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </div>
      </div>
    </div>
  );
}
