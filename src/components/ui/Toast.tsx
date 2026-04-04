"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  type: "error" | "warning" | "success" | "info";
  title: string;
  message?: string;
  duration?: number;
}

// Global toast state (simple pub/sub)
let listeners: ((toast: ToastMessage) => void)[] = [];

export function showToast(toast: Omit<ToastMessage, "id">) {
  const id = Math.random().toString(36).slice(2);
  const msg = { ...toast, id };
  listeners.forEach((fn) => fn(msg));
}

const ICONS = {
  error: <AlertCircle size={16} className="text-red-400 shrink-0" />,
  warning: <AlertTriangle size={16} className="text-yellow-400 shrink-0" />,
  success: <CheckCircle2 size={16} className="text-green-400 shrink-0" />,
  info: <AlertCircle size={16} className="text-blue-400 shrink-0" />,
};

const BORDERS = {
  error: "border-red-500/30 bg-red-500/10",
  warning: "border-yellow-500/30 bg-yellow-500/10",
  success: "border-green-500/30 bg-green-500/10",
  info: "border-blue-500/30 bg-blue-500/10",
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handler = (toast: ToastMessage) => {
      setToasts((prev) => [...prev, toast]);
      // Auto-remove after duration
      const duration = toast.duration || (toast.type === "error" ? 6000 : 4000);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, duration);
    };
    listeners.push(handler);
    return () => {
      listeners = listeners.filter((fn) => fn !== handler);
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-2 px-4 py-3 rounded-xl border shadow-lg
            backdrop-blur-sm animate-slide-up ${BORDERS[toast.type]}`}
        >
          {ICONS[toast.type]}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-[#e4e4e7]">{toast.title}</p>
            {toast.message && (
              <p className="text-xs text-gray-500 dark:text-[#a1a1aa] mt-0.5">{toast.message}</p>
            )}
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            className="text-gray-400 hover:text-gray-900 dark:text-[#52525b] dark:hover:text-[#e4e4e7] transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
