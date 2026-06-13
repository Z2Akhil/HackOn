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
        <footer style={{ borderTop: "1px solid #27272a", textAlign: "center", padding: "16px", fontSize: "12px", color: "#52525b", fontFamily: "Figtree, sans-serif" }}>
          ReLoop · HackOn with Amazon 6.0 · Second Life Commerce
        </footer>
      </body>
    </html>
  );
}
