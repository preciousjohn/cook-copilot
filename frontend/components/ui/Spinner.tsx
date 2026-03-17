"use client";

import React from "react";

interface SpinnerProps {
  size?: number;
  color?: string;
}

export function Spinner({ size = 20, color = "currentColor" }: SpinnerProps) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: `2px solid ${color}`,
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

/** Full-width loading state with label */
export function LoadingBlock({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        padding: "80px 24px",
        color: "var(--fg3)",
      }}
    >
      <Spinner size={28} />
      <span style={{ fontSize: "14px", letterSpacing: "0.03em" }}>{label}</span>
    </div>
  );
}
