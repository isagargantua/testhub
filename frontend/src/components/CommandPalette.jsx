import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const apiUrl = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/$/, "");

// Global ⌘K / Ctrl+K palette for jumping around the app.
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();
  const inputRef = useRef(null);

  const commands = useMemo(() => {
    const base = [
      { label: "Dashboard", hint: "Overview", to: "/" },
      { label: "Projects", hint: "Workspaces", to: "/projects" },
      { label: "Test Cases", hint: "Library", to: "/test-cases" },
    ];
    if (user?.role === "ADMIN") {
      base.push({ label: "Users", hint: "Admin", to: "/users" });
      base.push({ label: "File Storage", hint: "Admin · storage", to: "/dump" });
      base.push({ label: "API Docs", hint: "Swagger", href: `${apiUrl}/docs` });
    }
    return base;
  }, [user]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      const t = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  if (!open) return null;

  const run = (cmd) => {
    setOpen(false);
    if (cmd.href) {
      window.open(cmd.href, "_blank", "noopener,noreferrer");
    } else {
      navigate(cmd.to);
    }
  };

  const onInputKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(filtered.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[active]) run(filtered[active]);
    }
  };

  return createPortal(
    <div
      className="cmdk-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Command palette">
        <input
          ref={inputRef}
          className="cmdk-input"
          placeholder="Jump to…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onInputKey}
        />
        <div className="cmdk-list">
          {filtered.length ? (
            filtered.map((cmd, i) => (
              <button
                type="button"
                key={cmd.to || cmd.href}
                className={`cmdk-item ${i === active ? "is-active" : ""}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => run(cmd)}
              >
                <span className="cmdk-label">{cmd.label}</span>
                <span className="cmdk-hint">{cmd.hint}</span>
              </button>
            ))
          ) : (
            <div className="cmdk-empty">No matches</div>
          )}
        </div>
        <div className="cmdk-foot">↑↓ navigate · ↵ open · esc close</div>
      </div>
    </div>,
    document.body
  );
}
