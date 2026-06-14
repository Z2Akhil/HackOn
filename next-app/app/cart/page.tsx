"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AZ } from "@/lib/ui-theme";
import { CartItem, CART_EVENT, getCart, setQty, removeFromCart, clearCart } from "@/lib/cart";
import { Minus, Plus, Trash2, ShoppingCart, CheckCircle2, Leaf } from "lucide-react";

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [placed, setPlaced] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const sync = () => setItems(getCart());
    sync();
    window.addEventListener(CART_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CART_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const subtotal = items.reduce((s, c) => s + c.price * c.qty, 0);
  const savings = items.reduce((s, c) => s + ((c.mrp ?? c.price) - c.price) * c.qty, 0);
  const totalQty = items.reduce((n, c) => n + c.qty, 0);

  function placeOrder() {
    clearCart();
    setPlaced(true);
  }

  // Avoid hydration mismatch (localStorage only on client)
  if (!mounted) return <div style={{ background: AZ.page, minHeight: "100%" }} />;

  if (placed) {
    return (
      <div style={{ background: AZ.page, minHeight: "100%" }}>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center" style={{ fontFamily: "Figtree, sans-serif" }}>
          <div className="rounded-lg p-10" style={{ background: AZ.card, border: `1px solid ${AZ.border}` }}>
            <CheckCircle2 size={56} color={AZ.green} className="mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>Order placed</h1>
            <p className="text-sm mb-1" style={{ color: AZ.ink2 }}>
              Thanks for shopping second life. Your order is confirmed and on its way.
            </p>
            <p className="text-sm inline-flex items-center gap-1.5 mt-2" style={{ color: AZ.green }}>
              <Leaf size={15} /> You helped keep {totalQty} item{totalQty === 1 ? "" : "s"} in circulation.
            </p>
            <div className="flex gap-3 justify-center mt-6">
              <Link href="/marketplace" className="px-5 py-2.5 rounded-full text-sm font-medium"
                    style={{ background: AZ.ctaYellow, border: `1px solid ${AZ.ctaYellowBorder}`, color: AZ.ink }}>
                Continue shopping
              </Link>
              <Link href="/" className="px-5 py-2.5 rounded-full text-sm font-medium"
                    style={{ background: AZ.card, border: `1px solid ${AZ.border}`, color: AZ.ink }}>
                Back home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: AZ.page, minHeight: "100%" }}>
      <div className="max-w-6xl mx-auto px-4 py-6" style={{ fontFamily: "Figtree, sans-serif" }}>
        <h1 className="text-2xl font-bold mb-4" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>
          Shopping Cart
        </h1>

        {items.length === 0 ? (
          <div className="rounded-lg p-12 text-center" style={{ background: AZ.card, border: `1px solid ${AZ.border}` }}>
            <ShoppingCart size={40} color={AZ.ink2} className="mx-auto mb-3" />
            <p className="font-bold text-lg" style={{ color: AZ.ink }}>Your cart is empty</p>
            <p className="text-sm mt-1 mb-4" style={{ color: AZ.ink2 }}>Browse certified open-box & refurbished deals.</p>
            <Link href="/marketplace" className="inline-block px-5 py-2.5 rounded-full text-sm font-medium"
                  style={{ background: AZ.ctaYellow, border: `1px solid ${AZ.ctaYellowBorder}`, color: AZ.ink }}>
              Shop the Marketplace
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-12 gap-4 items-start">
            {/* Line items */}
            <div className="md:col-span-8 rounded-lg p-4" style={{ background: AZ.card, border: `1px solid ${AZ.border}` }}>
              {items.map((it, i) => (
                <div key={it.id} className="flex gap-4 py-4" style={{ borderTop: i === 0 ? "none" : `1px solid ${AZ.border}` }}>
                  <div className="w-24 h-24 rounded-md flex-shrink-0 flex items-center justify-center" style={{ background: "#fff", border: `1px solid ${AZ.border}`, padding: 8 }}>
                    {it.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.image} alt={it.name} className="max-w-full max-h-full object-contain mix-blend-multiply" />
                    ) : <ShoppingCart size={24} color={AZ.ink2} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: AZ.ink }}>{it.name}</p>
                    {it.condition && <p className="text-xs mt-0.5" style={{ color: AZ.green }}>{it.condition}</p>}
                    <p className="text-lg font-bold mt-1" style={{ color: AZ.priceRed }}>₹{it.price.toLocaleString("en-IN")}</p>
                    {it.mrp && it.mrp > it.price && (
                      <p className="text-xs" style={{ color: AZ.ink2 }}>M.R.P.: <span className="line-through">₹{it.mrp.toLocaleString("en-IN")}</span></p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {/* qty stepper */}
                      <div className="inline-flex items-center rounded-full overflow-hidden" style={{ border: `1px solid ${AZ.border}` }}>
                        <button onClick={() => setQty(it.id, it.qty - 1)} className="px-2.5 py-1.5" style={{ color: AZ.ink }} aria-label="Decrease quantity"><Minus size={14} /></button>
                        <span className="px-3 text-sm font-medium" style={{ color: AZ.ink }}>{it.qty}</span>
                        <button onClick={() => setQty(it.id, it.qty + 1)} className="px-2.5 py-1.5" style={{ color: AZ.ink }} aria-label="Increase quantity"><Plus size={14} /></button>
                      </div>
                      <button onClick={() => removeFromCart(it.id)} className="inline-flex items-center gap-1 text-xs hover:underline" style={{ color: AZ.link }}>
                        <Trash2 size={13} /> Remove
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: AZ.ink }}>₹{(it.price * it.qty).toLocaleString("en-IN")}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="md:col-span-4 rounded-lg p-4 flex flex-col gap-3" style={{ background: AZ.card, border: `1px solid ${AZ.border}` }}>
              <div className="flex items-baseline justify-between">
                <span className="text-sm" style={{ color: AZ.ink2 }}>Subtotal ({totalQty} item{totalQty === 1 ? "" : "s"})</span>
                <span className="text-xl font-bold" style={{ color: AZ.ink }}>₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              {savings > 0 && (
                <p className="text-xs" style={{ color: AZ.green }}>You save ₹{savings.toLocaleString("en-IN")} vs. buying new</p>
              )}
              <button onClick={placeOrder} className="w-full py-2.5 rounded-full text-sm font-medium"
                      style={{ background: AZ.ctaYellow, border: `1px solid ${AZ.ctaYellowBorder}`, color: AZ.ink }}>
                Place order
              </button>
              <Link href="/marketplace" className="text-xs text-center hover:underline" style={{ color: AZ.link }}>
                Continue shopping
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
