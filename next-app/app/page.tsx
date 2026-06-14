import { getProducts } from "@/lib/data";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";
import { AZ } from "@/lib/ui-theme";
import { Recycle, ShieldCheck, TrendingUp, Leaf } from "lucide-react";

const STATS = [
  { n: "47", label: "Items processed", Icon: Recycle },
  { n: "₹1.84L", label: "Value recovered", Icon: TrendingUp },
  { n: "12", label: "Returns prevented", Icon: ShieldCheck },
  { n: "38.5kg", label: "E-waste diverted", Icon: Leaf },
];

export default function HomePage() {
  const products = getProducts();
  return (
    <div style={{ background: AZ.page, minHeight: "100%" }}>
      {/* Hero banner */}
      <div style={{ background: "linear-gradient(180deg,#232F3E 0%,#37475A 100%)" }}>
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold"
                  style={{ background: "rgba(6,125,98,0.25)", color: "#fff" }}>
              <Recycle size={13} color={AZ.ctaOrange} /> Second Life Commerce · HackOn with Amazon 6.0
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2" style={{ fontFamily: "Syne, sans-serif" }}>
            Every product deserves a second life.
          </h1>
          <p className="text-sm max-w-2xl mb-6" style={{ color: "#D5D9D9", fontFamily: "Figtree, sans-serif" }}>
            AI grades returned items, optimises disposition across 5 channels, and matches each item to its next best owner — at scale.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link href="/account" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md font-bold text-sm"
                  style={{ background: AZ.ctaYellow, border: `1px solid ${AZ.ctaYellowBorder}`, color: AZ.ink, fontFamily: "Figtree, sans-serif" }}>
              My Orders &amp; Returns
            </Link>
            <Link href="/marketplace" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md font-bold text-sm"
                  style={{ background: "#fff", border: `1px solid ${AZ.border}`, color: AZ.ink, fontFamily: "Figtree, sans-serif" }}>
              Browse Marketplace →
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-6">
        {/* KPI strip floating over hero */}
        <div className="rounded-lg grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden"
             style={{ background: AZ.border, border: `1px solid ${AZ.border}` }}>
          {STATS.map(({ n, label, Icon }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-4" style={{ background: AZ.card }}>
              <div className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: AZ.greenBg }}>
                <Icon size={20} color={AZ.green} />
              </div>
              <div>
                <div className="text-xl font-bold" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>{n}</div>
                <div className="text-xs" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Product catalog */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="rounded-lg p-4 mb-4" style={{ background: AZ.card, border: `1px solid ${AZ.border}` }}>
          <h2 className="text-xl font-bold" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>Today&apos;s Catalog</h2>
          <p className="text-sm mt-0.5" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
            Click any product — AI predicts your return risk before you buy.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
