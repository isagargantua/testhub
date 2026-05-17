import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-8">TestHub</h1>

      <nav className="space-y-2">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `block px-3 py-2 rounded transition ${
              isActive ? "bg-blue-600" : "hover:bg-gray-800"
            }`
          }
        >
          Dashboard
        </NavLink>

        <NavLink
          to="/projects"
          className={({ isActive }) =>
            `block px-3 py-2 rounded transition ${
              isActive ? "bg-blue-600" : "hover:bg-gray-800"
            }`
          }
        >
          Projects
        </NavLink>
      </nav>
    </div>
  );
}
