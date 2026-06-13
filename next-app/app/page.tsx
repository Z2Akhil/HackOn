import { getProducts } from "@/lib/data";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";

export default function HomePage() {
  const products = getProducts();
  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ borderBottom: "1px solid #27272a" }}>
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(16,185,129,0.08) 0%, transparent 70%)"
        }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-32 opacity-30" style={{ background: "linear-gradient(to bottom, #10b981, transparent)" }} />

        <div className="max-w-6xl mx-auto px-5 py-16 text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 animate-fade-in" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <span className="text-xs" style={{ color: "#10b981" }}>♻</span>
            <span className="text-xs font-semibold" style={{ color: "#10b981", fontFamily: "Figtree, sans-serif" }}>Second Life Commerce · HackOn with Amazon 6.0</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-4 animate-fade-up" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa", letterSpacing: "-0.03em" }}>
            Every product deserves<br />
            <span style={{ color: "#10b981" }}>a second life.</span>
          </h1>

          <p className="text-lg max-w-xl mx-auto mb-10 animate-fade-up delay-1" style={{ color: "#71717a", fontFamily: "Figtree, sans-serif" }}>
            AI grades returned items, optimises disposition across 5 channels, and matches each item to its next best owner — at scale.
          </p>

          <div className="flex flex-wrap gap-6 justify-center animate-fade-up delay-2">
            {[
              { n: "47", label: "Items processed" },
              { n: "₹1.84L", label: "Value recovered" },
              { n: "12", label: "Returns prevented" },
              { n: "38.5kg", label: "E-waste diverted" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold" style={{ fontFamily: "Syne, sans-serif", color: "#10b981" }}>{stat.n}</div>
                <div className="text-xs" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Demo flow CTA */}
          <div className="flex flex-wrap gap-3 justify-center mt-8 animate-fade-up delay-2">
            <Link
              href="/account"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: "#10b981", color: "#0c0c0e", fontFamily: "Figtree, sans-serif" }}
            >
              ♻ My Orders & Returns
            </Link>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-80"
              style={{ background: "#111113", color: "#fafafa", border: "1px solid #3f3f46", fontFamily: "Figtree, sans-serif" }}
            >
              Browse Marketplace →
            </Link>
          </div>
        </div>
      </div>

      {/* Product grid */}
      <div className="max-w-6xl mx-auto px-5 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>Product Catalog</h2>
            <p className="text-sm mt-0.5" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>Click any product — AI predicts your return risk before you buy.</p>
          </div>
          <div className="text-sm font-medium px-3 py-1.5 rounded-lg" style={{ background: "#18181b", color: "#52525b", border: "1px solid #27272a", fontFamily: "Figtree, sans-serif" }}>
            {products.length} products
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {products.map((p, i) => (
            <div key={p.id} className="animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
