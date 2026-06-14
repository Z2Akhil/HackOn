import { getProducts } from "@/lib/data";
import { notFound } from "next/navigation";
import PreventionBanner from "@/components/PreventionBanner";
import StarRating from "@/components/StarRating";
import AddToCartButtons from "@/components/AddToCartButtons";
import Link from "next/link";
import { AZ } from "@/lib/ui-theme";
import { ratingFor, reviewCountFor, formatCount } from "@/lib/ratings";
import { ChevronRight, ShieldCheck, Truck, RotateCcw, Leaf } from "lucide-react";

const CATEGORY_LABEL: Record<string, string> = {
  electronics: "Electronics", apparel: "Apparel", home_appliances: "Home Appliances",
  home: "Home & Living", accessories: "Accessories", beauty: "Beauty", sports: "Sports",
};

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const products = getProducts();
  const product = products.find((p) => p.id === id);
  if (!product) notFound();

  const rating = ratingFor(product.id, "A");
  const reviews = reviewCountFor(product.id, "A");
  const openBox = Math.round(product.mrp * 0.72);

  return (
    <div style={{ background: AZ.page, minHeight: "100%" }}>
      <div className="max-w-6xl mx-auto px-4 py-4" style={{ fontFamily: "Figtree, sans-serif" }}>
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-xs mb-3" style={{ color: AZ.ink2 }}>
          <Link href="/" style={{ color: AZ.link }}>Home</Link>
          <ChevronRight size={12} />
          <span>{CATEGORY_LABEL[product.category] ?? product.category}</span>
          <ChevronRight size={12} />
          <span className="truncate" style={{ color: AZ.ink }}>{product.name}</span>
        </div>

        <div className="rounded-lg grid md:grid-cols-12 gap-6 p-5" style={{ background: AZ.card, border: `1px solid ${AZ.border}` }}>
          {/* Image */}
          <div className="md:col-span-5">
            <div className="aspect-square rounded-md flex items-center justify-center" style={{ background: "#fff", border: `1px solid ${AZ.border}`, padding: 20 }}>
              {product.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.image} alt={product.name} className="max-w-full max-h-full object-contain mix-blend-multiply" />
              ) : <span style={{ color: AZ.ink2 }}>No image</span>}
            </div>
          </div>

          {/* Title + rating + prevention */}
          <div className="md:col-span-4 flex flex-col gap-3">
            <h1 className="text-2xl font-bold" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>{product.name}</h1>
            <div className="flex items-center gap-2">
              <StarRating rating={rating} size={15} showValue />
              <span className="text-sm hover:underline" style={{ color: AZ.link }}>{formatCount(reviews)} ratings</span>
            </div>
            <div style={{ borderTop: `1px solid ${AZ.border}`, paddingTop: 12 }}>
              <span className="text-3xl font-bold" style={{ color: AZ.priceRed }}>
                <span className="text-sm align-top">₹</span>{product.mrp.toLocaleString("en-IN")}
              </span>
              <span className="text-xs ml-2" style={{ color: AZ.ink2 }}>incl. all taxes</span>
              <div className="text-xs mt-1" style={{ color: AZ.ink2 }}>
                M.R.P.: <span className="line-through">₹{product.mrp.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <PreventionBanner productId={product.id} category={product.category} topReturnReason={product.top_return_reason} />

            {/* Trust row */}
            <div className="grid grid-cols-3 gap-2 mt-1">
              {[
                { Icon: ShieldCheck, label: "AI Graded" },
                { Icon: RotateCcw, label: "Easy Returns" },
                { Icon: Leaf, label: "Second Life" },
              ].map(({ Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1 text-center">
                  <Icon size={18} color={AZ.green} />
                  <span className="text-xs" style={{ color: AZ.ink2 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Buy box */}
          <div className="md:col-span-3">
            <div className="rounded-lg p-4 flex flex-col gap-2" style={{ border: `1px solid ${AZ.border}` }}>
              <span className="text-2xl font-bold" style={{ color: AZ.priceRed }}>
                <span className="text-sm align-top">₹</span>{product.mrp.toLocaleString("en-IN")}
              </span>
              <div className="flex items-center gap-1 text-xs" style={{ color: AZ.ink2 }}>
                <Truck size={13} /> FREE delivery
              </div>
              <p className="text-sm font-semibold" style={{ color: AZ.green }}>In stock</p>
              <AddToCartButtons item={{ id: product.id, name: product.name, price: product.mrp, mrp: product.mrp, image: product.image }} />
              <Link href="/marketplace" className="text-xs text-center mt-1 hover:underline" style={{ color: AZ.link }}>
                See open-box from ₹{openBox.toLocaleString("en-IN")} →
              </Link>
            </div>
          </div>
        </div>

        {/* Product stats */}
        <div className="rounded-lg mt-4 p-5 grid grid-cols-3 gap-4" style={{ background: AZ.card, border: `1px solid ${AZ.border}` }}>
          {[
            { label: "Category Return Rate", value: `${Math.round(product.avg_return_rate * 100)}%` },
            { label: "Top Return Reason", value: product.top_return_reason.replace(/_/g, " ") },
            { label: "AI Grading", value: "Live" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-lg font-bold capitalize" style={{ color: AZ.ink, fontFamily: "Syne, sans-serif" }}>{s.value}</div>
              <div className="text-xs mt-0.5" style={{ color: AZ.ink2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
