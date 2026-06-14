// Lightweight client-side cart backed by localStorage.
// No backend — fine for the demo. Components subscribe via the CART_EVENT
// (dispatched on every mutation) plus the native "storage" event for
// cross-tab sync.

export interface CartItem {
  id: string;          // unique line id (product id or listing id)
  name: string;
  price: number;       // unit price in ₹
  mrp?: number;        // optional original price for strikethrough
  image?: string;
  condition?: string;  // e.g. "Open Box · Like New" (marketplace items)
  qty: number;
}

const KEY = "reloop_cart";
export const CART_EVENT = "reloop-cart";

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function save(items: CartItem[]): void {
  localStorage.setItem(KEY, JSON.stringify(items));
  // Notify same-tab listeners; "storage" only fires in *other* tabs.
  window.dispatchEvent(new Event(CART_EVENT));
}

export function addToCart(item: Omit<CartItem, "qty">, qty = 1): void {
  const cart = getCart();
  const existing = cart.find((c) => c.id === item.id);
  if (existing) existing.qty += qty;
  else cart.push({ ...item, qty });
  save(cart);
}

export function setQty(id: string, qty: number): void {
  const cart = getCart();
  const it = cart.find((c) => c.id === id);
  if (!it) return;
  if (qty <= 0) {
    save(cart.filter((c) => c.id !== id));
    return;
  }
  it.qty = qty;
  save(cart);
}

export function removeFromCart(id: string): void {
  save(getCart().filter((c) => c.id !== id));
}

export function clearCart(): void {
  save([]);
}

export function cartCount(): number {
  return getCart().reduce((n, c) => n + c.qty, 0);
}

export function cartSubtotal(): number {
  return getCart().reduce((sum, c) => sum + c.price * c.qty, 0);
}
