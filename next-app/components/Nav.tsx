"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const links = [
  { href: "/", label: "Shop" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/dashboard", label: "Ops" },
];

export default function Nav() {
  const path = usePathname();
  const [initials, setInitials] = useState("R");

  useEffect(() => {
    function syncInitials() {
      try {
        const stored = localStorage.getItem("reloop_profile");
        if (stored) {
          const name = JSON.parse(stored).name as string;
          setInitials(name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase());
        }
      } catch {}
    }
    syncInitials();
    window.addEventListener("storage", syncInitials);
    return () => window.removeEventListener("storage", syncInitials);
  }, []);
  return (
    <nav className="border-b sticky top-0 z-50" style={{ background: "rgba(12,12,14,0.85)", backdropFilter: "blur(20px)", borderColor: "#27272a" }}>
      <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">

        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: "linear-gradient(135deg,#10b981,#065f46)" }}>
            ♻
          </div>
          <span className="font-bold text-base tracking-tight" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>
            Re<span style={{ color: "#10b981" }}>Loop</span>
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: "#10b98120", color: "#10b981", fontFamily: "Figtree, sans-serif" }}>
            AI
          </span>
        </Link>

        <div className="flex items-center gap-0.5">
          {links.map((l) => {
            const active = path === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  color: active ? "#10b981" : "#71717a",
                  background: active ? "rgba(16,185,129,0.08)" : "transparent",
                  fontFamily: "Figtree, sans-serif",
                }}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: "#18181b", border: "1px solid #27272a" }}>
            <div className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: "#10b981" }} />
            <span className="text-xs font-semibold" style={{ color: "#10b981", fontFamily: "Figtree, sans-serif" }}>AI Live</span>
          </div>
          <Link
            href="/account"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black transition-all hover:opacity-80"
            style={{ background: "linear-gradient(135deg,#10b981,#065f46)", color: "#fff", fontFamily: "Syne, sans-serif" }}
            title="My Account"
          >
            {initials}
          </Link>
        </div>
      </div>
    </nav>
  );
}
