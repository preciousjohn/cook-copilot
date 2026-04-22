"use client";

import { useState, useEffect } from "react";

const MESSAGES: Record<string, string[]> = {
  dietitian: [
    "Reading your nutrition profile…",
    "Calculating your daily targets…",
    "Checking allergen restrictions…",
    "Balancing macros for your meal…",
    "Almost done with your nutrition plan…",
  ],
  chef: [
    "Brainstorming recipe ideas…",
    "Selecting the best ingredients…",
    "Designing your syringe pastes…",
    "Making sure everything is printable…",
    "Finalizing your recipe…",
  ],
  engineer: [
    "Converting recipe to print paths…",
    "Calculating extrusion amounts…",
    "Tracing the silhouette contours…",
    "Optimizing the G-code layers…",
    "Almost ready to print!",
  ],
  silhouettes: [
    "Generating shape variants…",
    "Drawing Classic form…",
    "Drawing Rounded form…",
    "Drawing Geometric form…",
    "Finishing up the shapes…",
  ],
};

interface StageLoaderProps {
  stage: keyof typeof MESSAGES;
}

export function StageLoader({ stage }: StageLoaderProps) {
  const messages = MESSAGES[stage] ?? ["Loading…"];
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setIndex(0);
    setVisible(true);
  }, [stage]);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % messages.length);
        setVisible(true);
      }, 300);
    }, 2800);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 20, padding: "80px 24px",
    }}>
      {/* Animated dots */}
      <div style={{ display: "flex", gap: 8 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "rgb(21, 60, 54)",
            display: "inline-block",
            animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>

      {/* Cycling message */}
      <p style={{
        margin: 0, fontSize: 14, color: "#6B5D50",
        fontFamily: "'Geist', sans-serif",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(6px)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
        minHeight: 22, textAlign: "center",
      }}>
        {messages[index]}
      </p>

      <style>{`
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-10px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
