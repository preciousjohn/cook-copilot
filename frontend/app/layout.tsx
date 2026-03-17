import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CookCopilot — AI-Powered Personalized Food Fabrication",
  description: "Multi-stage AI-assisted food fabrication pipeline by Morphing Matter Lab",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Default theme is "landing" (dark). The WizardShell switches to "app" after Step 1.
    <html lang="en" data-theme="landing">
      <body>{children}</body>
    </html>
  );
}
