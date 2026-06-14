// Shared Amazon-style design tokens for the whole ReLoop app.
// Light retail theme. Import { AZ } and use these instead of ad-hoc hex so every
// screen stays visually consistent.

export const AZ = {
  // surfaces
  page: "#EAEDED",        // app background (Amazon light gray)
  card: "#FFFFFF",
  surfaceAlt: "#F7F8F8",
  border: "#D5D9D9",
  borderDark: "#888C8C",

  // header / chrome (Amazon dark slate)
  header: "#131921",
  headerAlt: "#232F3E",

  // text
  ink: "#0F1111",         // primary text
  ink2: "#565959",        // secondary text
  link: "#007185",        // link blue
  linkHover: "#C7511F",   // link hover / active orange-brown

  // price / deal
  priceRed: "#B12704",    // big price red used on detail pages
  deal: "#CC0C39",        // discount % / deal red

  // ratings
  star: "#FFA41C",

  // CTAs
  ctaYellow: "#FFD814",
  ctaYellowBorder: "#FCD200",
  ctaOrange: "#FFA41C",
  ctaOrangeBorder: "#FF8F00",

  // sustainability (ReLoop green accent)
  green: "#067D62",
  greenBg: "#E7F5F1",

  // status accents
  blue: "#146EB4",
  amber: "#8A6D00",
  amberBg: "#FEF6E0",
  red: "#B12704",
  redBg: "#FDECEC",
} as const;

// Grade → human condition label + color (Amazon "Renewed/Open-Box" style).
export const CONDITION: Record<string, { label: string; short: string; color: string; bg: string }> = {
  "A":  { label: "Open Box · Like New",        short: "Like New",       color: "#067D62", bg: "#E7F5F1" },
  "A-": { label: "Open Box · Minor Cosmetic",  short: "Minor Cosmetic", color: "#067D62", bg: "#E7F5F1" },
  "B+": { label: "Refurbished · Moderate Wear", short: "Moderate Wear", color: "#8A6D00", bg: "#FEF6E0" },
  "B":  { label: "Refurbished · Heavy Wear",   short: "Heavy Wear",     color: "#B45309", bg: "#FDEEDC" },
  "C":  { label: "Used · Acceptable",          short: "Acceptable",     color: "#B12704", bg: "#FDECEC" },
};

// Disposition channel → color (used by dashboard + disposition card).
export const CHANNEL_COLOR: Record<string, string> = {
  resell: "#067D62", refurbish: "#146EB4", donate: "#8b5cf6", recycle: "#1B8E3D", exchange: "#8A6D00",
};
