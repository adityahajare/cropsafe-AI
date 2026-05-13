import React, { useEffect } from "react";

interface NotificationProps {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({
  message,
  type,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const colors: Record<string, string> = {
    success: "#28a745",
    error: "#dc3545",
    info: "#17a2b8",
  };

  const icons: Record<string, string> = {
    success: "✅",
    error: "❌",
    info: "ℹ️",
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "80px",
        right: "20px",
        minWidth: "250px",
        padding: "12px 16px",
        background: "#fff",
        borderRadius: "10px",
        boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
        borderLeft: `5px solid ${colors[type]}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
        zIndex: 9999,
        animation: "fadeSlide 0.3s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span>{icons[type]}</span>
        <span style={{ fontSize: "14px", color: "#333" }}>{message}</span>
      </div>

      <button
        onClick={onClose}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontSize: "18px",
          color: "#666",
        }}
      >
        ×
      </button>

      {/* animation */}
      <style>
        {`
          @keyframes fadeSlide {
            from {
              transform: translateX(20px);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
};

export default Notification;