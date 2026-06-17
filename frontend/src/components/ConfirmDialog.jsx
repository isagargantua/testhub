import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

const ConfirmContext = createContext(null);

// useConfirm() returns an async function:
//   const ok = await confirm({ title, message, confirmLabel, danger })
// Resolves true if confirmed, false otherwise. Falls back to window.confirm
// if used without the provider.
export function useConfirm() {
  return (
    useContext(ConfirmContext) ||
    (async ({ message } = {}) => window.confirm(message || "Are you sure?"))
  );
}

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback(
    (opts = {}) =>
      new Promise((resolve) => {
        resolverRef.current = resolve;
        setState({
          title: "Are you sure?",
          message: "",
          confirmLabel: "Confirm",
          cancelLabel: "Cancel",
          danger: true,
          ...opts,
        });
      }),
    []
  );

  const close = useCallback((result) => {
    setState(null);
    const resolve = resolverRef.current;
    resolverRef.current = null;
    if (resolve) resolve(result);
  }, []);

  useEffect(() => {
    if (!state) return;
    const onKey = (e) => {
      if (e.key === "Escape") close(false);
      else if (e.key === "Enter") close(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(20,18,15,0.38)] p-4 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) close(false);
            }}
          >
            <div className="card w-full max-w-sm" role="alertdialog" aria-modal="true">
              <h2 className="display-title text-2xl text-[#2f2419]">
                {state.title}
              </h2>
              {state.message && (
                <p className="mt-3 text-sm leading-6 text-[#75675a]">
                  {state.message}
                </p>
              )}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => close(false)}
                >
                  {state.cancelLabel}
                </button>
                <button
                  type="button"
                  autoFocus
                  className={`btn ${state.danger ? "btn-danger" : ""}`}
                  onClick={() => close(true)}
                >
                  {state.confirmLabel}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </ConfirmContext.Provider>
  );
}
