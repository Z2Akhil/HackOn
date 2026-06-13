"use client";
import Link from "next/link";
import { Product } from "@/types";

function categoryEmoji(cat: string) {
  const map: Record<string, string> = {
    electronics: "📱", apparel: "👕", home_appliances: "🏠",
    home: "🛋️", accessories: "⌚", beauty: "💄", sports: "🏃",
  };
  return map[cat] ?? "📦";
}

export default function ProductCard({ product }: { product: Product }) {

  return (
    <Link
      href={`/product/${product.id}`}
      className="group block rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: "#111113",
        border: "1px solid #27272a",
      }}
    >
      <style>{`
        .product-card-${product.id}:hover {
          border-color: #3f3f46 !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0,0,0,0.4);
        }
      `}</style>
      <div className={`product-card-${product.id} rounded-xl overflow-hidden h-full`} style={{ border: "1px solid transparent" }}>
        {/* Image area */}
        <div className="aspect-square flex items-center justify-center text-5xl relative overflow-hidden" style={{ background: "#18181b" }}>
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "radial-gradient(circle at center, rgba(16,185,129,0.06), transparent 70%)" }} />
          {product.image
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            : categoryEmoji(product.category)
          }
        </div>

        {/* Info */}
        <div className="p-3 space-y-2">
          <p className="text-sm font-semibold line-clamp-2 leading-snug" style={{ color: "#fafafa", fontFamily: "Figtree, sans-serif" }}>
            {product.name}
          </p>

          <div className="flex items-center justify-between">
            <span className="font-bold text-base" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>
              ₹{product.mrp.toLocaleString("en-IN")}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md capitalize" style={{ background: "#18181b", color: "#52525b", border: "1px solid #27272a", fontFamily: "Figtree, sans-serif" }}>
              {product.category.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
