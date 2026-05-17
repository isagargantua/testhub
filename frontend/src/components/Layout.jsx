import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";

import Navbar from "./Navbar";

export default function Layout() {
  return (
    <div className="flex">
      <Sidebar />

      <div className="flex-1">
        <Navbar />

        <div className="p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}