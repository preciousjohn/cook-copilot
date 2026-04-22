"use client";

import React, { useState, useEffect } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  loadingMessages?: string[];
}

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary: {
    background: "rgb(21, 60, 54)",
    color: "#FFF4E6",
    border: "1.5px solid rgb(21, 60, 54)",
  },
  secondary: {
    background: "transparent",
    color: "#1A1410",
    border: "1.5px solid rgba(26,20,16,0.2)",
  },
  ghost: {
    background: "transparent",
    color: "#6B5D50",
    border: "1px solid transparent",
  },
  danger: {
    background: "transparent",
    color: "#c0392b",
    border: "1px solid #c0392b",
  },
};

const sizeStyles: Record<Size, React.CSSProperties> = {
  sm: { padding: "6px 12px", fontSize: "12px", borderRadius: "6px" },
  md: { padding: "10px 20px", fontSize: "14px", borderRadius: "8px" },
  lg: { padding: "14px 28px", fontSize: "15px", borderRadius: "10px" },
};

function Dots() {
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center", marginRight: 2 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          width: 4, height: 4, borderRadius: "50%",
          background: "currentColor", display: "inline-block",
          animation: `btnDot 1.1s ease-in-out ${i * 0.18}s infinite`,
        }} />
      ))}
    </span>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingMessages,
  disabled,
  children,
  style,
  ...props
}: ButtonProps) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (!loading || !loadingMessages?.length) { setMsgIndex(0); return; }
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setMsgIndex((i) => (i + 1) % loadingMessages.length);
        setFade(true);
      }, 220);
    }, 2600);
    return () => clearInterval(interval);
  }, [loading, loadingMessages]);

  const label = loading && loadingMessages?.length
    ? loadingMessages[msgIndex]
    : children;

  return (
    <>
      <style>{`
        @keyframes btnDot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
      <button
        disabled={disabled || loading}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          fontWeight: 500,
          cursor: disabled || loading ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          transition: "opacity 0.15s",
          letterSpacing: "0.01em",
          whiteSpace: "nowrap",
          minWidth: loading && loadingMessages ? 160 : undefined,
          ...variantStyles[variant],
          ...sizeStyles[size],
          ...style,
        }}
        {...props}
      >
        {loading && <Dots />}
        <span style={{
          opacity: fade ? 1 : 0,
          transition: "opacity 0.22s ease",
          display: "inline-block",
        }}>
          {label}
        </span>
      </button>
    </>
  );
}
