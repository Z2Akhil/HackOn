"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ScoreWidget from "@/components/ScoreWidget";

const links = [
  { href: "/", label: "Shop" },
  { href: "/return", label: "Returns" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/dashboard", label: "Ops" },
];

export default function Nav() {
  const path = usePathname();
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
          <ScoreWidget mode="nav" />
        </div>
      </div>
    </nav>
  );
}
