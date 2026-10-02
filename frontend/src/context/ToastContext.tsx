import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ToastType = "" | "success" | "error";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastValue {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, type: ToastType = "") => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, message, type }]);
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3600);
  }, []);

  const value = useMemo<ToastValue>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast${toast.type ? ` toast-${toast.type}` : ""}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}