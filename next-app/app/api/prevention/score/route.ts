import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/lib/data";

const ML_SERVICE = process.env.ML_SERVICE_URL ?? "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customer_id, product_id, variant } = body;

    const products = getProducts();
    const product = products.find((p) => p.id === product_id);
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const price_band =
      product.mrp < 2000 ? "budget" : product.mrp < 15000 ? "mid" : "premium";

    const payload = {
      customer_id,
      product_id,
      category: product.category,
      price_band,
      product_return_rate: product.avg_return_rate,
      variant_size_mismatch_rate: variant === "mismatch" ? 1.0 : 0.0,
      top_return_reason: product.top_return_reason,
      review_fit_sentiment: product.category === "apparel" ? -0.3 : 0.1,
      customer_total_returns: body.customer_total_returns ?? 3,
      customer_lifetime_orders: body.customer_lifetime_orders ?? 20,
      customer_category_return_rate: body.customer_category_return_rate ?? product.avg_return_rate,
    };

    // Try real ML service, fall back to mock
    try {
      const res = await fetch(`${ML_SERVICE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {
      // ML service unavailable — use deterministic mock
    }

    const mock_risk = Math.min(0.95, product.avg_return_rate * 2.2 + (payload.variant_size_mismatch_rate * 0.3));
    return NextResponse.json({
      risk: parseFloat(mock_risk.toFixed(3)),
      top_driver: product.avg_return_rate > 0.15 ? "high product return rate" : "your return history in this category",
      recommended_intervention: mock_risk > 0.6 ? "show_banner_with_variant_suggestion" : mock_risk > 0.4 ? "soft_nudge" : "none",
      mock: true,
    });
  } catch (e) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
