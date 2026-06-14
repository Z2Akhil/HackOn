"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Recycle, Search, MapPin, ShoppingCart, ChevronDown } from "lucide-react";
import { AZ } from "@/lib/ui-theme";
import { CART_EVENT, cartCount } from "@/lib/cart";

const links = [
  { href: "/", label: "Shop" },
  { href: "/marketplace", label: "Second Life Marketplace" },
  { href: "/dashboard", label: "Ops Dashboard" },
];

export default function Nav() {
  const path = usePathname();
  const router = useRouter();
  const [name, setName] = useState("Guest");
  const [query, setQuery] = useState("");
  const [count, setCount] = useState(0);

  useEffect(() => {
    const syncCount = () => setCount(cartCount());
    syncCount();
    window.addEventListener(CART_EVENT, syncCount);
    window.addEventListener("storage", syncCount);
    return () => {
      window.removeEventListener(CART_EVENT, syncCount);
      window.removeEventListener("storage", syncCount);
    };
  }, []);

  useEffect(() => {
    function syncInitials() {
      try {
        const stored = localStorage.getItem("reloop_profile");
        if (stored) {
          const n = JSON.parse(stored).name as string;
          setName(n.split(" ")[0]);
        }
      } catch {}
    }
    syncInitials();
    window.addEventListener("storage", syncInitials);
    return () => window.removeEventListener("storage", syncInitials);
  }, []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    // Route all searches to the marketplace, which filters its listings by ?q=.
    router.push(q ? `/marketplace?q=${encodeURIComponent(q)}` : "/marketplace");
  }

  return (
    <header className="sticky top-0 z-50" style={{ fontFamily: "Figtree, sans-serif" }}>
      {/* Top bar */}
      <div style={{ background: AZ.header }}>
        <div className="max-w-7xl mx-auto px-3 h-[58px] flex items-center gap-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:outline hover:outline-1" style={{ outlineColor: "#fff" }}>
            <Recycle size={22} color={AZ.green} />
            <span className="font-bold text-lg tracking-tight text-white" style={{ fontFamily: "Syne, sans-serif" }}>
              Re<span style={{ color: AZ.ctaOrange }}>Loop</span>
            </span>
          </Link>

          {/* Deliver to */}
          <Link href="/account" className="hidden md:flex items-end gap-0.5 px-2 py-1 rounded hover:outline hover:outline-1 text-white" style={{ outlineColor: "#fff" }}>
            <MapPin size={16} className="mb-0.5" color="#fff" />
            <div className="leading-tight">
              <div className="text-[11px]" style={{ color: "#ccc" }}>Deliver to {name}</div>
              <div className="text-xs font-bold">India</div>
            </div>
          </Link>

          {/* Search */}
          <form onSubmit={submitSearch} className="flex-1 flex items-stretch h-10 rounded-md overflow-hidden" style={{ minWidth: 120 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search certified open-box & refurbished"
              aria-label="Search products"
              className="flex-1 px-3 text-sm outline-none"
              style={{ background: "#fff", color: AZ.ink }}
            />
            <button type="submit" className="px-3 flex items-center justify-center" style={{ background: AZ.ctaOrange }} aria-label="Search">
              <Search size={18} color={AZ.header} />
            </button>
          </form>

          {/* Account */}
          <Link href="/account" className="hidden sm:block px-2 py-1 rounded hover:outline hover:outline-1 text-white leading-tight" style={{ outlineColor: "#fff" }}>
            <div className="text-[11px]" style={{ color: "#ccc" }}>Hello, {name}</div>
            <div className="text-xs font-bold flex items-center gap-0.5">Account &amp; Lists <ChevronDown size={12} /></div>
          </Link>

          {/* Cart */}
          <Link href="/cart" className="relative px-2 py-1 rounded hover:outline hover:outline-1 text-white flex items-center gap-1" style={{ outlineColor: "#fff" }}>
            <span className="relative">
              <ShoppingCart size={22} color="#fff" />
              {count > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-black flex items-center justify-center"
                      style={{ background: AZ.ctaOrange, color: AZ.header }}>
                  {count}
                </span>
              )}
            </span>
            <span className="hidden sm:inline text-xs font-bold">Cart</span>
          </Link>
        </div>
      </div>

      {/* Secondary nav */}
      <div style={{ background: AZ.headerAlt }}>
        <div className="max-w-7xl mx-auto px-3 h-10 flex items-center gap-1">
          {links.map((l) => {
            const active = path === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className="px-2.5 py-1.5 rounded text-sm font-medium text-white transition-all hover:outline hover:outline-1"
                style={{
                  outlineColor: "#fff",
                  background: active ? "rgba(255,255,255,0.12)" : "transparent",
                }}
              >
                {l.label}
              </Link>
            );
          })}
          <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded" style={{ background: "rgba(6,125,98,0.25)" }}>
            <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: AZ.ctaOrange }} />
            <span className="text-xs font-semibold" style={{ color: "#fff" }}>AI Pipeline Live</span>
          </div>
        </div>
      </div>
    </header>
  );
}
