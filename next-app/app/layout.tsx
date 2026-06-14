import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "ReLoop — Second Life Commerce",
  description: "AI-powered returns & sustainable resale",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Figtree:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet" />
      </head>
      <body style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Nav />
        <main style={{ flex: 1 }}>{children}</main>
        <footer style={{ background: "#232F3E", textAlign: "center", padding: "24px 16px", fontSize: "12px", color: "#cccccc", fontFamily: "Figtree, sans-serif" }}>
          <div style={{ color: "#fff", fontFamily: "Syne, sans-serif", fontWeight: 700, marginBottom: 4 }}>
            Re<span style={{ color: "#FFA41C" }}>Loop</span>
          </div>
          ReLoop · HackOn with Amazon 6.0 · Second Life Commerce
        </footer>
      </body>
    </html>
  );
}
