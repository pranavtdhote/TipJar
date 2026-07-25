"use client";

import { useEffect, useState } from "react";

export interface Toast {
  id: string;
  type: "success" | "error" | "pending" | "info";
  title: string;
  message?: string;
  txHash?: string;
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="toast-container" role="region" aria-label="Notifications">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-item toast-${toast.type}`}
          role="status"
          aria-live="polite"
        >
          <div className="toast-icon">
            {toast.type === "success" && "🎉"}
            {toast.type === "error" && "⚠️"}
            {toast.type === "pending" && "⏳"}
            {toast.type === "info" && "ℹ️"}
          </div>
          <div className="toast-body">
            <div className="toast-title">{toast.title}</div>
            {toast.message && <div className="toast-message">{toast.message}</div>}
            {toast.txHash && (
              <div className="toast-tx">
                <span className="mono-text">Tx: {toast.txHash.slice(0, 10)}…{toast.txHash.slice(-6)}</span>
              </div>
            )}
          </div>
          <button
            className="toast-close"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
