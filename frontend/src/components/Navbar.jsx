import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <div className="bg-white shadow px-6 py-4 flex justify-between items-center">
      <div>
        <div className="font-semibold">Welcome {user?.name}</div>

        <div className="text-sm text-gray-500">{user?.role}</div>
      </div>

      <button onClick={logout} className="btn">
        Logout
      </button>
    </div>
  );
}
