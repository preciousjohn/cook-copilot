"use client";

import React from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary: {
    background: "var(--fg)",
    color: "var(--bg)",
    border: "1px solid var(--fg)",
  },
  secondary: {
    background: "transparent",
    color: "var(--fg)",
    border: "1px solid var(--border)",
  },
  ghost: {
    background: "transparent",
    color: "var(--fg2)",
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

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        fontWeight: 500,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled || loading ? 0.5 : 1,
        transition: "opacity 0.15s, transform 0.1s",
        letterSpacing: "0.01em",
        whiteSpace: "nowrap",
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      {...props}
    >
      {loading && (
        <span
          style={{
            width: "14px",
            height: "14px",
            border: "2px solid currentColor",
            borderTopColor: "transparent",
            borderRadius: "50%",
            display: "inline-block",
            animation: "spin 0.7s linear infinite",
          }}
        />
      )}
      {children}
    </button>
  );
}
