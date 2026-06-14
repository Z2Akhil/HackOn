"use client";
import Link from "next/link";
import { Product } from "@/types";
import { AZ } from "@/lib/ui-theme";
import { ratingFor, reviewCountFor, formatCount } from "@/lib/ratings";
import StarRating from "@/components/StarRating";
import { Leaf, Truck } from "lucide-react";

const CATEGORY_LABEL: Record<string, string> = {
  electronics: "Electronics", apparel: "Apparel", home_appliances: "Home Appliances",
  home: "Home & Living", accessories: "Accessories", beauty: "Beauty", sports: "Sports",
};

export default function ProductCard({ product }: { product: Product }) {
  // Catalog items are "new" — derive a stable rating from the id.
  const rating = ratingFor(product.id, "A");
  const reviews = reviewCountFor(product.id, "A");
  // Show an illustrative open-box price (resale-ish) next to MRP.
  const openBox = Math.round(product.mrp * 0.72);
  const discount = Math.round((1 - openBox / product.mrp) * 100);

  return (
    <Link
      href={`/product/${product.id}`}
      className="group block rounded-lg overflow-hidden transition-shadow h-full"
      style={{ background: AZ.card, border: `1px solid ${AZ.border}` }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(15,17,17,0.15)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
    >
      {/* Image */}
      <div className="aspect-square flex items-center justify-center" style={{ background: "#fff", padding: 14 }}>
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt={product.name} className="max-w-full max-h-full object-contain mix-blend-multiply" />
        ) : (
          <span style={{ color: AZ.ink2 }}>No image</span>
        )}
      </div>

      {/* Info */}
      <div className="px-3 pb-3 flex flex-col gap-1">
        <span className="text-xs" style={{ color: AZ.ink2 }}>{CATEGORY_LABEL[product.category] ?? product.category}</span>
        <p className="text-sm leading-snug line-clamp-2 group-hover:underline" style={{ color: AZ.link }}>
          {product.name}
        </p>
        <div className="flex items-center gap-1.5">
          <StarRating rating={rating} size={13} />
          <span className="text-xs hover:underline" style={{ color: AZ.link }}>{formatCount(reviews)}</span>
        </div>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className="text-lg font-bold" style={{ color: AZ.ink }}>
            <span className="text-xs align-top">₹</span>{product.mrp.toLocaleString("en-IN")}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs" style={{ color: AZ.green }}>
          <Leaf size={12} /> Open-box from ₹{openBox.toLocaleString("en-IN")} ({discount}% off)
        </div>
        <div className="flex items-center gap-1 text-xs" style={{ color: AZ.ink2 }}>
          <Truck size={12} /> FREE delivery
        </div>
      </div>
    </Link>
  );
}
