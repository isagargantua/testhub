const styles = {
  PASS: "bg-[rgba(88,137,102,0.14)] text-[#466451]",
  FAIL: "bg-[rgba(168,80,63,0.14)] text-[#8c4638]",
  SKIP: "bg-[rgba(203,153,71,0.16)] text-[#946d2f]",
  BLOCKED: "bg-[rgba(96,94,114,0.14)] text-[#555365]",
  IN_PROGRESS: "bg-[rgba(88,112,155,0.14)] text-[#455d87]",
  COMPLETED: "bg-[rgba(88,137,102,0.14)] text-[#466451]",
  ACTIVE: "bg-[rgba(88,137,102,0.14)] text-[#466451]",
  ARCHIVED: "bg-[rgba(96,94,114,0.14)] text-[#555365]",
  LOW: "bg-[rgba(120,116,108,0.14)] text-[#666052]",
  MEDIUM: "bg-[rgba(88,112,155,0.14)] text-[#455d87]",
  HIGH: "bg-[rgba(201,111,59,0.14)] text-[#9d552c]",
  CRITICAL: "bg-[rgba(168,80,63,0.14)] text-[#8c4638]",
};

export default function Badge({ children }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
        styles[children] || "bg-[rgba(120,116,108,0.14)] text-[#666052]"
      }`}
    >
      {children}
    </span>
  );
}
