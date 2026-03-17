"use client";

import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: string;
}

export function Card({ children, style, padding = "24px", ...props }: CardProps) {
  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderRadius: "12px",
        padding,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
