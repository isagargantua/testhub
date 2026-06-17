import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

const ToastContext = createContext(null);

// Safe to call even outside a provider (returns no-ops) so components don't
// crash if rendered standalone.
const NOOP = { show() {}, success() {}, error() {}, info() {} };

export function useToast() {
  return useContext(ToastContext) || NOOP;
}

const ICONS = {
  success: "✓",
  error: "!",
  info: "i",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message, type = "info", duration = 4000) => {
      const id = ++idRef.current;
      setToasts((list) => [...list, { id, message, type }]);
      if (duration) window.setTimeout(() => remove(id), duration);
      return id;
    },
    [remove]
  );

  const api = useMemo(
    () => ({
      show,
      success: (m, d) => show(m, "success", d),
      error: (m, d) => show(m, "error", d),
      info: (m, d) => show(m, "info", d),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="toast-host" role="region" aria-label="Notifications">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast-${t.type}`} role="status">
              <span className="toast-icon" aria-hidden="true">
                {ICONS[t.type] || ICONS.info}
              </span>
              <span className="toast-msg">{t.message}</span>
              <button
                type="button"
                className="toast-close"
                onClick={() => remove(t.id)}
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}
