// Re-exports from static-data — no fs, works on Vercel serverless
export {
  PRODUCTS as getProductsData,
  BUYERS,
  RETURN_EVENTS,
  RESALE_REFERENCE,
  MARKETPLACE_LISTINGS,
  incrementListingFlag,
  getListingFlags,
} from "./static-data";

import { PRODUCTS, BUYERS, RETURN_EVENTS, RESALE_REFERENCE, MARKETPLACE_LISTINGS } from "./static-data";
import type { Product, Buyer, MarketplaceListing } from "@/types";

export function getProducts(): Product[] { return PRODUCTS; }
export function getBuyers(): Buyer[] { return BUYERS; }
export function getReturnEvents(): typeof RETURN_EVENTS { return RETURN_EVENTS; }
export function getResaleReference(): typeof RESALE_REFERENCE { return RESALE_REFERENCE; }
export function getMarketplaceListings(): MarketplaceListing[] { return MARKETPLACE_LISTINGS; }
