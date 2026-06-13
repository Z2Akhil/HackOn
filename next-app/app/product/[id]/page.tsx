import { getProducts } from "@/lib/data";
import { notFound } from "next/navigation";
import PreventionBanner from "@/components/PreventionBanner";
import Link from "next/link";

function categoryEmoji(cat: string) {
  const map: Record<string, string> = {
    electronics: "📱", apparel: "👕", home_appliances: "🏠",
    home: "🛋️", accessories: "⌚", beauty: "💄", sports: "🏃",
  };
  return map[cat] ?? "📦";
}

const CATEGORY_LABEL: Record<string, string> = {
  electronics: "Electronics", apparel: "Apparel", home_appliances: "Home Appliances",
  home: "Home & Living", accessories: "Accessories", beauty: "Beauty", sports: "Sports",
};

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const products = getProducts();
  const product = products.find((p) => p.id === id);
  if (!product) notFound();

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm mb-8 transition-colors" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>
        <span>←</span> Back to catalog
      </Link>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Image */}
        <div className="animate-fade-up">
          <div className="aspect-square rounded-2xl flex items-center justify-center text-[120px] relative overflow-hidden" style={{ background: "#111113", border: "1px solid #27272a" }}>
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(16,185,129,0.05), transparent 70%)" }} />
            {product.image
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded-2xl" />
              : categoryEmoji(product.category)
            }
          </div>
        </div>

        {/* Product info */}
        <div className="flex flex-col gap-5 animate-fade-up delay-1">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>
              {CATEGORY_LABEL[product.category] ?? product.category}
            </span>
            <h1 className="text-3xl font-bold mt-2 mb-1" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa", letterSpacing: "-0.02em" }}>
              {product.name}
            </h1>
            <div className="flex items-baseline gap-3 mt-3">
              <span className="text-4xl font-bold" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>
                ₹{product.mrp.toLocaleString("en-IN")}
              </span>
              <span className="text-sm" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>incl. all taxes</span>
            </div>
          </div>

          {/* Prevention banner */}
          <PreventionBanner
            productId={product.id}
            category={product.category}
            topReturnReason={product.top_return_reason}
          />

          {/* Actions */}
          <div className="flex gap-3">
            <button className="flex-1 font-semibold py-3.5 rounded-xl transition-all hover:opacity-90 active:scale-[0.98]" style={{ background: "#f59e0b", color: "#0c0c0e", fontFamily: "Figtree, sans-serif", fontSize: "15px" }}>
              Add to Cart
            </button>
            <button className="flex-1 font-semibold py-3.5 rounded-xl transition-all hover:opacity-80" style={{ background: "#18181b", color: "#fafafa", border: "1px solid #3f3f46", fontFamily: "Figtree, sans-serif", fontSize: "15px" }}>
              Buy Now
            </button>
          </div>


          {/* Product stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Return Rate", value: `${Math.round(product.avg_return_rate * 100)}%` },
              { label: "Top Reason", value: product.top_return_reason.replace("_", " ") },
              { label: "AI Graded", value: "✓ Live" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg p-3 text-center" style={{ background: "#111113", border: "1px solid #27272a" }}>
                <div className="text-sm font-bold" style={{ color: "#fafafa", fontFamily: "Syne, sans-serif" }}>{s.value}</div>
                <div className="text-xs mt-0.5" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
