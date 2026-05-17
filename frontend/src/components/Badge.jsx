const styles = {
  PASS: "bg-green-100 text-green-700",
  FAIL: "bg-red-100 text-red-700",
  SKIP: "bg-yellow-100 text-yellow-700",
  BLOCKED: "bg-gray-200 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  ACTIVE: "bg-green-100 text-green-700",
  ARCHIVED: "bg-gray-200 text-gray-700",
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

export default function Badge({ children }) {
  return (
    <span
      className={`px-2 py-1 rounded text-sm font-medium ${
        styles[children] || "bg-gray-100 text-gray-700"
      }`}
    >
      {children}
    </span>
  );
}
