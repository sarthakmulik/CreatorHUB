"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  addToast: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const success = useCallback((msg: string) => addToast("success", msg), [addToast]);
  const error = useCallback((msg: string) => addToast("error", msg), [addToast]);
  const info = useCallback((msg: string) => addToast("info", msg), [addToast]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast, success, error, info }}>
      {children}
      
      {/* Toast Container */}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => {
          let Icon = Info;
          let color = "#3b82f6";
          let bgColor = "rgba(59, 130, 246, 0.1)";
          let borderColor = "rgba(59, 130, 246, 0.2)";

          if (toast.type === "success") {
            Icon = CheckCircle2;
            color = "#10b981";
            bgColor = "rgba(16, 185, 129, 0.1)";
            borderColor = "rgba(16, 185, 129, 0.2)";
          } else if (toast.type === "error") {
            Icon = XCircle;
            color = "#ef4444";
            bgColor = "rgba(239, 68, 68, 0.1)";
            borderColor = "rgba(239, 68, 68, 0.2)";
          }

          return (
            <div
              key={toast.id}
              className="glass animate-fade-in-up"
              style={{
                pointerEvents: "auto",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderRadius: 12,
                border: `1px solid ${borderColor}`,
                background: `var(--surface)`,
                boxShadow: `0 4px 12px rgba(0,0,0,0.2), 0 0 0 1px ${bgColor} inset`,
                minWidth: 300,
                maxWidth: 400,
              }}
            >
              <Icon size={20} color={color} style={{ flexShrink: 0 }} />
              <span style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 500, flex: 1, lineHeight: 1.4 }}>
                {toast.message}
              </span>
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 6,
                }}
                className="hover-bg"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
