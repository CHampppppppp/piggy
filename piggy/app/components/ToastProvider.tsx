'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { createPortal } from 'react-dom';

type ToastVariant = 'info' | 'success' | 'error';

type Toast = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue>({
  showToast: () => undefined
});

export const useToast = () => useContext(ToastContext);

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const [canRenderPortal, setCanRenderPortal] = useState(false);

  useEffect(() => {
    const timersMap = timers.current;
    return () => {
      timersMap.forEach((timeout) => clearTimeout(timeout));
      timersMap.clear();
    };
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { id, message, variant }]);

      const timer = setTimeout(() => removeToast(id), 3200);
      timers.current.set(id, timer);
    },
    [removeToast]
  );

  useEffect(() => {
    setCanRenderPortal(true);
  }, []);

  const contextValue = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {canRenderPortal &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-0 top-4 z-[9999] flex flex-col items-center gap-2 px-4">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className={`w-full max-w-xs rounded-2xl px-4 py-3 shadow-lg shadow-pink-200/50 ring-1 ring-white/70 backdrop-blur ${
                  toast.variant === 'error'
                    ? 'bg-gradient-to-r from-rose-200 to-pink-100 text-rose-700'
                    : toast.variant === 'success'
                      ? 'bg-gradient-to-r from-emerald-200 to-green-100 text-emerald-700'
                      : 'bg-gradient-to-r from-purple-200 to-pink-100 text-purple-700'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span>
                    {toast.variant === 'error'
                      ? '💔'
                      : toast.variant === 'success'
                        ? '💖'
                        : '✨'}
                  </span>
                  <p>{toast.message}</p>
                </div>
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}


