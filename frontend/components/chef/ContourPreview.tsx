"use client";


export function ContourPreview({ b64 }: { b64: string | null }) {
  if (!b64) return null;
  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderRadius: "12px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--fg3)",
        }}
      >
        Shape preview
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/png;base64,${b64}`}
          alt="Food silhouette contour"
          style={{ width: "100%", borderRadius: "8px", imageRendering: "pixelated" }}
        />
      </div>
    </div>
  );
}
