"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addToCart, CartItem } from "@/lib/cart";
import { AZ } from "@/lib/ui-theme";
import { Check } from "lucide-react";

// Add to Cart + Buy Now pair. Used on the product detail buy box.
export default function AddToCartButtons({ item }: { item: Omit<CartItem, "qty"> }) {
  const router = useRouter();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addToCart(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  function handleBuyNow() {
    addToCart(item);
    router.push("/cart");
  }

  return (
    <>
      <button
        onClick={handleAdd}
        className="w-full py-2 rounded-full text-sm font-medium mt-1 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
        style={{ background: AZ.ctaYellow, border: `1px solid ${AZ.ctaYellowBorder}`, color: AZ.ink }}
      >
        {added ? (<><Check size={15} /> Added to Cart</>) : "Add to Cart"}
      </button>
      <button
        onClick={handleBuyNow}
        className="w-full py-2 rounded-full text-sm font-medium transition-all active:scale-[0.98]"
        style={{ background: AZ.ctaOrange, border: `1px solid ${AZ.ctaOrangeBorder}`, color: AZ.ink }}
      >
        Buy Now
      </button>
    </>
  );
}
