"use client";

import React from "react";

interface Step1LandingProps {
  onEnter: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Landing Page
//
// Full-screen dark landing with a background video (autoplay, loop, muted).
// Place your video at /public/video/landing.mp4.
// ─────────────────────────────────────────────────────────────────────────────

export function Step1Landing({ onEnter }: Step1LandingProps) {
  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100dvh",
        background: "#080808",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Background video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center 65%",
          opacity: 0.6,
        }}
      >
        <source src="/video/landing.mov" type="video/mp4" />
        <source src="/video/landing.mov" type="video/quicktime" />
      </video>

      {/* Dark overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, rgba(8,8,8,0.3) 0%, rgba(8,8,8,0.75) 70%, rgba(8,8,8,0.95) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Centered text content */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          textAlign: "center",
          padding: "0 24px",
          maxWidth: "600px",
        }}
      >
        {/* Main title */}
        <h1
          style={{
            fontSize: "clamp(52px, 10vw, 88px)",
            fontWeight: 800,
            color: "#f0f0f0",
            letterSpacing: "-0.03em",
            lineHeight: 0.95,
            marginBottom: "20px",
            animation: "fadeUp 0.8s ease 0.4s both",
          }}
        >
          CookCopilot
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: "clamp(14px, 2.5vw, 18px)",
            color: "rgba(240,240,240,0.55)",
            letterSpacing: "0.04em",
            marginBottom: "56px",
            animation: "fadeUp 0.8s ease 0.6s both",
          }}
        >
          AI-Powered Personalized Food Fabrication
        </p>

        {/* CTA button */}
        <button
          onClick={onEnter}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            padding: "14px 32px",
            fontSize: "14px",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "#080808",
            background: "#f0f0f0",
            border: "none",
            borderRadius: "100px",
            cursor: "pointer",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            animation: "fadeUp 0.8s ease 0.8s both",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 32px rgba(240,240,240,0.2)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
          }}
        >
          Begin
        </button>
      </div>

    </div>
  );
}
