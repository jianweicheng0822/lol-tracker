import { useEffect, useState } from "react";
import { COLORS } from "../utils/colors";

interface ToastProps {
  message: string;
  onDone: () => void;
}

export default function Toast({ message, onDone }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setVisible(false), 2000);
    const removeTimer = setTimeout(onDone, 2500);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [onDone]);

  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(72,209,160,0.15)",
        border: "1px solid rgba(72,209,160,0.4)",
        color: COLORS.textPrimary,
        padding: "10px 28px",
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 600,
        zIndex: 9999,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.4s ease",
        pointerEvents: "none",
      }}
    >
      {message}
    </div>
  );
}
