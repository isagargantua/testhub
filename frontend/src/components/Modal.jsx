import { useEffect } from "react";

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(20,18,15,0.38)] p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card w-full max-w-lg flex flex-col" style={{ maxHeight: "90vh" }}>
        {/* Fixed header */}
        <div className="mb-5 flex items-center justify-between gap-4 flex-shrink-0">
          <div>
            <div className="eyebrow">Create</div>
            <h2 className="mt-2 display-title text-3xl">{title}</h2>
          </div>
          <button onClick={onClose} className="btn-secondary px-3 flex-shrink-0">
            Close
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 pr-1">
          {children}
        </div>
      </div>
    </div>
  );
}
