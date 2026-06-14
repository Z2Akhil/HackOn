// All data hardcoded — no fs reads, works on Vercel serverless
import { Product, Buyer, MarketplaceListing, GradeResult } from "@/types";
import { computeCircularityScore } from "./circularity";

const CDN = "https://cdn.dummyjson.com/product-images";

// Return history — defined first so top_return_reason can be derived from it
export const RETURN_EVENTS = [
  { id:"r001", product_id:"p003", product_name:"Bajaj Mixer Grinder 750W",          category:"home_appliances", mrp:3499,  return_reason:"defective",       customer_id:"c042", photos:[`${CDN}/kitchen-accessories/boxed-blender/thumbnail.webp`],          mock_grade:{ grade:"A-",functional_risk:"low",   defects:["minor scuff on lid","light scratches on base"], packaging_status:"missing_box",     accessories_complete:true,  confidence:0.88 } },
  { id:"r002", product_id:"p001", product_name:"Sony WH-1000XM5 Headphones",        category:"electronics",     mrp:29990, return_reason:"changed_mind",     customer_id:"c017", photos:[`${CDN}/mobile-accessories/apple-airpods-max-silver/thumbnail.webp`], mock_grade:{ grade:"A", functional_risk:"none",  defects:[],                               packaging_status:"original_box",    accessories_complete:true,  confidence:0.95 } },
  { id:"r003", product_id:"p004", product_name:"Levis 511 Slim Fit Jeans",           category:"apparel",         mrp:4999,  return_reason:"wrong_size",       customer_id:"c091", photos:[`${CDN}/mens-shirts/blue-&-black-check-shirt/thumbnail.webp`],      mock_grade:{ grade:"A", functional_risk:"none",  defects:[],                               packaging_status:"original_box",    accessories_complete:true,  confidence:0.97 } },
  { id:"r004", product_id:"p009", product_name:"Bombay Dyeing Double Bedsheet Set",  category:"home",            mrp:1499,  return_reason:"not_as_described", customer_id:"c055", photos:[`${CDN}/furniture/annibale-colombo-bed/thumbnail.webp`],             mock_grade:{ grade:"A", functional_risk:"none",  defects:["colour slightly different from listing"],       packaging_status:"original_box",    accessories_complete:true,  confidence:0.91 } },
  { id:"r005", product_id:"p008", product_name:"boAt Airdopes 141 TWS Earbuds",      category:"electronics",     mrp:1299,  return_reason:"defective",        customer_id:"c033", photos:[`${CDN}/mobile-accessories/apple-airpods/thumbnail.webp`],          mock_grade:{ grade:"B+",functional_risk:"medium",defects:["left earbud intermittent audio","case hinge loose"],packaging_status:"missing_box",     accessories_complete:false, confidence:0.82 } },
  { id:"r006", product_id:"p002", product_name:"Nike Air Max 270 Sneakers",          category:"apparel",         mrp:12995, return_reason:"wrong_size",       customer_id:"c078", photos:[`${CDN}/mens-shoes/nike-air-jordan-1-red-and-black/thumbnail.webp`], mock_grade:{ grade:"A", functional_risk:"none",  defects:[],                               packaging_status:"original_box",    accessories_complete:true,  confidence:0.96 } },
  { id:"r007", product_id:"p011", product_name:"Fastrack Analog Watch",              category:"accessories",     mrp:2995,  return_reason:"not_as_described", customer_id:"c014", photos:[`${CDN}/mens-watches/rolex-datejust/thumbnail.webp`],                mock_grade:{ grade:"A-",functional_risk:"none",  defects:["strap slightly different shade"],               packaging_status:"original_box",    accessories_complete:true,  confidence:0.89 } },
  { id:"r008", product_id:"p016", product_name:"Solimo Yoga Mat",                   category:"sports",          mrp:599,   return_reason:"not_as_described", customer_id:"c062", photos:[`${CDN}/sports-accessories/tennis-racket/thumbnail.webp`],          mock_grade:{ grade:"A", functional_risk:"none",  defects:[],                               packaging_status:"original_packaging",accessories_complete:true,  confidence:0.93 } },
];

// Category-level default when product has no return history
const CATEGORY_DEFAULT_REASON: Record<string, string> = {
  apparel:        "wrong_size",
  electronics:    "defective",
  home_appliances:"defective",
  home:           "not_as_described",
  accessories:    "not_as_described",
  beauty:         "not_as_described",
  sports:         "not_as_described",
};

// Derive top return reason from RETURN_EVENTS; fall back to category default
function deriveTopReturnReason(productId: string, category: string): string {
  const events = RETURN_EVENTS.filter(e => e.product_id === productId);
  if (events.length === 0) return CATEGORY_DEFAULT_REASON[category] ?? "defective";
  const freq: Record<string, number> = {};
  for (const e of events) freq[e.return_reason] = (freq[e.return_reason] ?? 0) + 1;
  return Object.entries(freq).sort(([, a], [, b]) => b - a)[0][0];
}

export const PRODUCTS: Product[] = [
  { id:"p001", name:"Sony WH-1000XM5 Headphones",           category:"electronics",    mrp:29990, avg_return_rate:0.08, top_return_reason:deriveTopReturnReason("p001","electronics"),    image:`${CDN}/mobile-accessories/apple-airpods-max-silver/thumbnail.webp` },
  { id:"p002", name:"Nike Air Max 270 Sneakers (M)",         category:"apparel",        mrp:12995, avg_return_rate:0.22, top_return_reason:deriveTopReturnReason("p002","apparel"),         image:`${CDN}/mens-shoes/nike-air-jordan-1-red-and-black/thumbnail.webp` },
  { id:"p003", name:"Bajaj Mixer Grinder 750W",              category:"home_appliances",mrp:3499,  avg_return_rate:0.11, top_return_reason:deriveTopReturnReason("p003","home_appliances"), image:`${CDN}/kitchen-accessories/boxed-blender/thumbnail.webp` },
  { id:"p004", name:"Levis 511 Slim Fit Jeans",              category:"apparel",        mrp:4999,  avg_return_rate:0.28, top_return_reason:deriveTopReturnReason("p004","apparel"),         image:`${CDN}/mens-shirts/blue-&-black-check-shirt/thumbnail.webp` },
  { id:"p005", name:"OnePlus Nord CE 4 (8GB/128GB)",         category:"electronics",    mrp:24999, avg_return_rate:0.06, top_return_reason:deriveTopReturnReason("p005","electronics"),    image:`${CDN}/smartphones/oppo-a57/thumbnail.webp` },
  { id:"p006", name:"Prestige Induction Cooktop",            category:"home_appliances",mrp:2199,  avg_return_rate:0.09, top_return_reason:deriveTopReturnReason("p006","home_appliances"), image:`${CDN}/kitchen-accessories/electric-stove/thumbnail.webp` },
  { id:"p007", name:"Wildcraft Backpack 45L",                category:"apparel",        mrp:3299,  avg_return_rate:0.07, top_return_reason:deriveTopReturnReason("p007","apparel"),         image:`${CDN}/womens-bags/white-faux-leather-backpack/thumbnail.webp` },
  { id:"p008", name:"boAt Airdopes 141 TWS Earbuds",         category:"electronics",    mrp:1299,  avg_return_rate:0.13, top_return_reason:deriveTopReturnReason("p008","electronics"),    image:`${CDN}/mobile-accessories/apple-airpods/thumbnail.webp` },
  { id:"p009", name:"Bombay Dyeing Double Bedsheet Set",     category:"home",           mrp:1499,  avg_return_rate:0.15, top_return_reason:deriveTopReturnReason("p009","home"),            image:`${CDN}/furniture/annibale-colombo-bed/thumbnail.webp` },
  { id:"p010", name:"Pigeon Non-Stick Tawa 30cm",            category:"home_appliances",mrp:899,   avg_return_rate:0.10, top_return_reason:deriveTopReturnReason("p010","home_appliances"), image:`${CDN}/kitchen-accessories/carbon-steel-wok/thumbnail.webp` },
  { id:"p011", name:"Fastrack Analog Watch (Men)",           category:"accessories",    mrp:2995,  avg_return_rate:0.09, top_return_reason:deriveTopReturnReason("p011","accessories"),    image:`${CDN}/mens-watches/rolex-datejust/thumbnail.webp` },
  { id:"p012", name:"Canon PIXMA G3010 Printer",             category:"electronics",    mrp:13995, avg_return_rate:0.10, top_return_reason:deriveTopReturnReason("p012","electronics"),    image:`${CDN}/laptops/asus-zenbook-pro-dual-screen-laptop/thumbnail.webp` },
  { id:"p013", name:"Puma Men's Track Jacket L",             category:"apparel",        mrp:2799,  avg_return_rate:0.19, top_return_reason:deriveTopReturnReason("p013","apparel"),         image:`${CDN}/mens-shirts/man-short-sleeve-shirt/thumbnail.webp` },
  { id:"p014", name:"Mi 80cm 4K UHD Smart TV",               category:"electronics",    mrp:54999, avg_return_rate:0.05, top_return_reason:deriveTopReturnReason("p014","electronics"),    image:`${CDN}/tablets/samsung-galaxy-tab-s8-plus-grey/thumbnail.webp` },
  { id:"p015", name:"Himalaya Face Wash Combo Pack",         category:"beauty",         mrp:349,   avg_return_rate:0.04, top_return_reason:deriveTopReturnReason("p015","beauty"),          image:`${CDN}/skin-care/olay-ultra-moisture-shea-butter-body-wash/thumbnail.webp` },
  { id:"p016", name:"Solimo Yoga Mat with Carry Strap",      category:"sports",         mrp:599,   avg_return_rate:0.06, top_return_reason:deriveTopReturnReason("p016","sports"),          image:`${CDN}/sports-accessories/tennis-racket/thumbnail.webp` },
  { id:"p017", name:"Havells 1.5T Inverter Split AC",        category:"home_appliances",mrp:42990, avg_return_rate:0.04, top_return_reason:deriveTopReturnReason("p017","home_appliances"), image:`${CDN}/kitchen-accessories/microwave-oven/thumbnail.webp` },
  { id:"p018", name:"Casio Scientific Calculator FX-991EX",  category:"electronics",    mrp:1295,  avg_return_rate:0.05, top_return_reason:deriveTopReturnReason("p018","electronics"),    image:`${CDN}/tablets/ipad-mini-2021-starlight/thumbnail.webp` },
  { id:"p019", name:"Duroflex Orthopaedic 6-Inch Mattress",  category:"home",           mrp:15999, avg_return_rate:0.08, top_return_reason:deriveTopReturnReason("p019","home"),            image:`${CDN}/furniture/annibale-colombo-sofa/thumbnail.webp` },
  { id:"p020", name:"Skechers Go Walk 7 (Women W7)",         category:"apparel",        mrp:5495,  avg_return_rate:0.24, top_return_reason:deriveTopReturnReason("p020","apparel"),         image:`${CDN}/womens-shoes/pampi-shoes/thumbnail.webp` },
];

export const BUYERS: Buyer[] = [
  { id:"b001", name:"Ankit Sharma",    price_band:"budget",  category_affinity:["electronics","home_appliances"], eco_preference:0.8,  grade_tolerance:["A","A-","B+"],       previous_refurb_purchases:3, location:"Mumbai" },
  { id:"b002", name:"Priya Nair",      price_band:"mid",     category_affinity:["apparel","accessories"],         eco_preference:0.9,  grade_tolerance:["A","A-"],             previous_refurb_purchases:1, location:"Bangalore" },
  { id:"b003", name:"Rohan Mehta",     price_band:"budget",  category_affinity:["electronics","sports"],          eco_preference:0.5,  grade_tolerance:["A","A-","B+","B"],   previous_refurb_purchases:2, location:"Delhi" },
  { id:"b004", name:"Divya Krishnan",  price_band:"mid",     category_affinity:["home","home_appliances"],        eco_preference:0.85, grade_tolerance:["A","A-"],             previous_refurb_purchases:0, location:"Chennai" },
  { id:"b005", name:"Saurabh Joshi",   price_band:"budget",  category_affinity:["electronics","accessories"],     eco_preference:0.4,  grade_tolerance:["A-","B+","B"],       previous_refurb_purchases:4, location:"Pune" },
  { id:"b006", name:"Meera Iyer",      price_band:"premium", category_affinity:["apparel","beauty"],              eco_preference:0.95, grade_tolerance:["A"],                  previous_refurb_purchases:0, location:"Hyderabad" },
  { id:"b007", name:"Karan Patel",     price_band:"budget",  category_affinity:["home_appliances","home"],        eco_preference:0.6,  grade_tolerance:["A-","B+","B"],       previous_refurb_purchases:2, location:"Ahmedabad" },
  { id:"b008", name:"Sneha Rao",       price_band:"mid",     category_affinity:["electronics","sports"],          eco_preference:0.75, grade_tolerance:["A","A-","B+"],       previous_refurb_purchases:1, location:"Bangalore" },
  { id:"b009", name:"Vikram Desai",    price_band:"premium", category_affinity:["electronics","accessories"],     eco_preference:0.7,  grade_tolerance:["A","A-"],             previous_refurb_purchases:0, location:"Mumbai" },
  { id:"b010", name:"Anjali Singh",    price_band:"budget",  category_affinity:["apparel","home"],                eco_preference:0.85, grade_tolerance:["A","A-","B+","B"],   previous_refurb_purchases:3, location:"Kolkata" },
];

// Resale reference: category → grade → {resale_pct, sell_prob, refurb_cost}
export const RESALE_REFERENCE: Record<string, Record<string, { expected_resale_pct_of_mrp: number; sell_through_prob: number; refurb_cost_pct: number }>> = {
  electronics:    { A:{expected_resale_pct_of_mrp:0.72,sell_through_prob:0.85,refurb_cost_pct:0.08}, "A-":{expected_resale_pct_of_mrp:0.62,sell_through_prob:0.75,refurb_cost_pct:0.10}, "B+":{expected_resale_pct_of_mrp:0.50,sell_through_prob:0.60,refurb_cost_pct:0.14}, B:{expected_resale_pct_of_mrp:0.38,sell_through_prob:0.45,refurb_cost_pct:0.20}, C:{expected_resale_pct_of_mrp:0.20,sell_through_prob:0.25,refurb_cost_pct:0.30} },
  apparel:        { A:{expected_resale_pct_of_mrp:0.55,sell_through_prob:0.80,refurb_cost_pct:0.05}, "A-":{expected_resale_pct_of_mrp:0.45,sell_through_prob:0.70,refurb_cost_pct:0.07}, "B+":{expected_resale_pct_of_mrp:0.35,sell_through_prob:0.55,refurb_cost_pct:0.10}, B:{expected_resale_pct_of_mrp:0.22,sell_through_prob:0.40,refurb_cost_pct:0.15}, C:{expected_resale_pct_of_mrp:0.10,sell_through_prob:0.20,refurb_cost_pct:0.20} },
  home_appliances:{ A:{expected_resale_pct_of_mrp:0.60,sell_through_prob:0.78,refurb_cost_pct:0.10}, "A-":{expected_resale_pct_of_mrp:0.50,sell_through_prob:0.68,refurb_cost_pct:0.13}, "B+":{expected_resale_pct_of_mrp:0.40,sell_through_prob:0.55,refurb_cost_pct:0.18}, B:{expected_resale_pct_of_mrp:0.28,sell_through_prob:0.40,refurb_cost_pct:0.25}, C:{expected_resale_pct_of_mrp:0.15,sell_through_prob:0.20,refurb_cost_pct:0.35} },
  home:           { A:{expected_resale_pct_of_mrp:0.52,sell_through_prob:0.75,refurb_cost_pct:0.06}, "A-":{expected_resale_pct_of_mrp:0.42,sell_through_prob:0.65,refurb_cost_pct:0.08}, "B+":{expected_resale_pct_of_mrp:0.32,sell_through_prob:0.50,refurb_cost_pct:0.12}, B:{expected_resale_pct_of_mrp:0.20,sell_through_prob:0.35,refurb_cost_pct:0.18}, C:{expected_resale_pct_of_mrp:0.08,sell_through_prob:0.18,refurb_cost_pct:0.25} },
  accessories:    { A:{expected_resale_pct_of_mrp:0.58,sell_through_prob:0.80,refurb_cost_pct:0.06}, "A-":{expected_resale_pct_of_mrp:0.48,sell_through_prob:0.70,refurb_cost_pct:0.08}, "B+":{expected_resale_pct_of_mrp:0.38,sell_through_prob:0.55,refurb_cost_pct:0.12}, B:{expected_resale_pct_of_mrp:0.25,sell_through_prob:0.40,refurb_cost_pct:0.16}, C:{expected_resale_pct_of_mrp:0.12,sell_through_prob:0.22,refurb_cost_pct:0.22} },
  beauty:         { A:{expected_resale_pct_of_mrp:0.30,sell_through_prob:0.60,refurb_cost_pct:0.02}, "A-":{expected_resale_pct_of_mrp:0.22,sell_through_prob:0.50,refurb_cost_pct:0.03}, "B+":{expected_resale_pct_of_mrp:0.14,sell_through_prob:0.38,refurb_cost_pct:0.04}, B:{expected_resale_pct_of_mrp:0.08,sell_through_prob:0.25,refurb_cost_pct:0.06}, C:{expected_resale_pct_of_mrp:0.03,sell_through_prob:0.10,refurb_cost_pct:0.08} },
  sports:         { A:{expected_resale_pct_of_mrp:0.50,sell_through_prob:0.75,refurb_cost_pct:0.05}, "A-":{expected_resale_pct_of_mrp:0.40,sell_through_prob:0.65,refurb_cost_pct:0.07}, "B+":{expected_resale_pct_of_mrp:0.30,sell_through_prob:0.52,refurb_cost_pct:0.10}, B:{expected_resale_pct_of_mrp:0.18,sell_through_prob:0.38,refurb_cost_pct:0.15}, C:{expected_resale_pct_of_mrp:0.08,sell_through_prob:0.20,refurb_cost_pct:0.20} },
};

// Listing-flag counters (module-level, resets on cold start)
const listingFlags: Record<string, number> = {};
export function incrementListingFlag(product_id: string): number {
  listingFlags[product_id] = (listingFlags[product_id] ?? 0) + 1;
  return listingFlags[product_id];
}
export function getListingFlags(): Record<string, number> {
  return { ...listingFlags };
}

// Lifespan estimates by category (years)
const CATEGORY_LIFESPAN: Record<string, number> = {
  electronics:8, home_appliances:7, home:10, accessories:5, apparel:3, sports:4, beauty:1,
};
// Grade multiplier on lifespan
const GRADE_LIFESPAN_MULT: Record<string, number> = { A:1.0, "A-":0.85, "B+":0.7, B:0.55, C:0.35 };
// Warranty months by grade
const GRADE_WARRANTY: Record<string, number> = { A:6, "A-":4, "B+":3, B:1, C:0 };
// CO2 saved for resell channel
const CO2_RESELL_KG = 14.2;
const DAY_MS = 1000 * 60 * 60 * 24;

// Factory that mirrors the listing-derivation logic so hand-built listings
// stay consistent with the auto-generated ones.
function buildListing(opts: {
  id: string;
  product_id: string;
  product_name: string;
  category: string;
  mrp: number;
  grade: GradeResult;
  age_days: number;
  image: string;
  asking_price?: number; // optional override (else derived from resale table)
}): MarketplaceListing {
  const { category: cat, grade } = opts;
  const g = grade.grade;
  const resalePct = RESALE_REFERENCE[cat]?.[g]?.expected_resale_pct_of_mrp ?? 0.5;
  const circularity = computeCircularityScore(grade, cat);
  const baseLifespan = CATEGORY_LIFESPAN[cat] ?? 5;
  const lifespan = parseFloat((baseLifespan * (GRADE_LIFESPAN_MULT[g] ?? 0.7)).toFixed(1));
  return {
    id: opts.id,
    product_id: opts.product_id,
    product_name: opts.product_name,
    category: cat,
    mrp: opts.mrp,
    asking_price: opts.asking_price ?? Math.round(opts.mrp * resalePct),
    grade,
    decision: "resell",
    listed_at: new Date(Date.now() - opts.age_days * DAY_MS).toISOString(),
    image: opts.image,
    circularity_score: circularity,
    co2_saved_kg: CO2_RESELL_KG,
    expected_lifespan_years: lifespan,
    warranty_months: GRADE_WARRANTY[g] ?? 0,
  };
}

// Auto-generated listings from return history
const BASE_LISTINGS: MarketplaceListing[] = RETURN_EVENTS.map((e, i) => {
  const cat = e.category;
  const g = e.mock_grade?.grade ?? "A-";
  const resalePct = RESALE_REFERENCE[cat]?.[g]?.expected_resale_pct_of_mrp ?? 0.5;
  const gradeObj = e.mock_grade as any;
  const circularity = computeCircularityScore(gradeObj, cat);
  const baseLifespan = CATEGORY_LIFESPAN[cat] ?? 5;
  const lifespan = parseFloat((baseLifespan * (GRADE_LIFESPAN_MULT[g] ?? 0.7)).toFixed(1));
  return {
    id: `listing_${e.id}`,
    product_id: e.product_id,
    product_name: e.product_name,
    category: cat,
    mrp: e.mrp,
    asking_price: Math.round(e.mrp * resalePct),
    grade: gradeObj,
    decision: "resell",
    listed_at: new Date(Date.now() - i * 3_600_000 * 24).toISOString(),
    image: e.photos[0] ?? "/images/placeholder.jpg",
    circularity_score: circularity,
    co2_saved_kg: CO2_RESELL_KG,
    expected_lifespan_years: lifespan,
    warranty_months: GRADE_WARRANTY[g] ?? 0,
  };
});

// Low-demand listings — Grade C (no buyer's grade_tolerance accepts "C", which
// strips the +30 grade points) in the `beauty` niche (only 1 buyer persona has
// affinity). Together these starve the demand sensor down to "low", so the
// dynamic-pricing engine MARKS THEM DOWN. Varying the listed age also triggers
// the staleness markdown, producing -6% / -12% / -18% drops. asking_price is
// set explicitly to keep prices believable (Grade-C beauty resale is punishing).
const LOW_DEMAND_LISTINGS: MarketplaceListing[] = [
  buildListing({
    id: "listing_low01",
    product_id: "p021",
    product_name: "Chanel Coco Noir Eau de Parfum (Open Box)",
    category: "beauty",
    mrp: 13999,
    asking_price: 5200, // ~37% of MRP
    grade: { grade: "C", functional_risk: "low", defects: ["~30% used", "box damaged", "cap scuffed"], packaging_status: "damaged_box", accessories_complete: false, confidence: 0.78 },
    age_days: 0, // fresh → low-demand markdown only (≈ -6%)
    image: `${CDN}/fragrances/chanel-coco-noir-eau-de/thumbnail.webp`,
  }),
  buildListing({
    id: "listing_low02",
    product_id: "p022",
    product_name: "L'Oréal Infallible Foundation Kit (Open Box)",
    category: "beauty",
    mrp: 2499,
    asking_price: 950, // ~38% of MRP
    grade: { grade: "C", functional_risk: "low", defects: ["multiple shades swatched", "carton torn", "pump stiff"], packaging_status: "missing_box", accessories_complete: false, confidence: 0.74 },
    age_days: 5, // aged 3–7d → stacked markdown (≈ -12%)
    image: `${CDN}/beauty/powder-canister/thumbnail.webp`,
  }),
  buildListing({
    id: "listing_low03",
    product_id: "p023",
    product_name: "Maybelline Lipstick Gift Set (Open Box)",
    category: "beauty",
    mrp: 1899,
    asking_price: 720, // ~38% of MRP
    grade: { grade: "C", functional_risk: "low", defects: ["2 shades used", "sleeve torn", "missing 1 item"], packaging_status: "missing_box", accessories_complete: false, confidence: 0.72 },
    age_days: 10, // stale >7d → biggest markdown (≈ -18%)
    image: `${CDN}/beauty/red-lipstick/thumbnail.webp`,
  }),
];

// Pre-built marketplace listings (auto-generated + curated low-demand examples)
export const MARKETPLACE_LISTINGS: MarketplaceListing[] = [...BASE_LISTINGS, ...LOW_DEMAND_LISTINGS];
