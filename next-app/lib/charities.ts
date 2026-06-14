// Static charity/NGO data with real locations in India
import { Charity, DonationRecord } from "@/types";

// Module-level store for donations (resets on cold start)
const DONATIONS_STORE: DonationRecord[] = [];

export const CHARITIES: Charity[] = [
  {
    id: "ngo_001",
    name: "GiveFood Foundation",
    description: "Distributing quality items to underprivileged communities across India",
    category: "livelihood",
    location: {
      latitude: 19.0760,
      longitude: 72.8777,
      address: "123 MG Road, Colaba",
      city: "Mumbai",
      state: "Maharashtra",
      zip: "400001",
    },
    impact_areas: ["Rural education", "Urban livelihood"],
    lives_impacted: 5420,
    items_received: 342,
    accepted_categories: ["electronics", "apparel", "home", "home_appliances", "accessories"],
    contact_person: "Rajesh Kumar",
    phone: "+91-98765-43210",
    email: "contact@givefood.org",
    logo: "🏫",
    verified: true,
  },
  {
    id: "ngo_002",
    name: "Health for All India",
    description: "Medical equipment and supplies for rural health clinics",
    category: "health",
    location: {
      latitude: 13.0827,
      longitude: 80.2707,
      address: "456 Chennai Medical Complex",
      city: "Chennai",
      state: "Tamil Nadu",
      zip: "600001",
    },
    impact_areas: ["Rural healthcare", "Preventive medicine"],
    lives_impacted: 8320,
    items_received: 512,
    accepted_categories: ["electronics", "home_appliances", "accessories", "apparel", "home"],
    contact_person: "Dr. Priya Sharma",
    phone: "+91-94565-32100",
    email: "health@healthforall.org",
    logo: "🏥",
    verified: true,
  },
  {
    id: "ngo_003",
    name: "Skill India Initiative",
    description: "Vocational training and livelihood support for underprivileged youth",
    category: "livelihood",
    location: {
      latitude: 28.7041,
      longitude: 77.1025,
      address: "789 Skill Centre, Dwarka",
      city: "Delhi",
      state: "Delhi",
      zip: "110077",
    },
    impact_areas: ["Youth empowerment", "Technical skills"],
    lives_impacted: 3210,
    items_received: 287,
    accepted_categories: ["electronics", "accessories", "sports", "apparel", "home", "home_appliances"],
    contact_person: "Anil Singh",
    phone: "+91-93452-10987",
    email: "skills@skillindia.org",
    logo: "🎓",
    verified: true,
  },
  {
    id: "ngo_004",
    name: "Education Forward",
    description: "Supporting education in rural schools through resources and tech",
    category: "education",
    location: {
      latitude: 23.1815,
      longitude: 79.9864,
      address: "321 Education Hub, Indore",
      city: "Indore",
      state: "Madhya Pradesh",
      zip: "452001",
    },
    impact_areas: ["School education", "Digital literacy"],
    lives_impacted: 6540,
    items_received: 421,
    accepted_categories: ["electronics", "home", "accessories", "apparel"],
    contact_person: "Sneha Patel",
    phone: "+91-92341-54321",
    email: "education@forward.org",
    logo: "📚",
    verified: true,
  },
  {
    id: "ngo_005",
    name: "Disability Empowerment Trust",
    description: "Providing assistive devices and support for persons with disabilities",
    category: "disability",
    location: {
      latitude: 17.3850,
      longitude: 78.4867,
      address: "555 Accessibility Center, Hyderabad",
      city: "Hyderabad",
      state: "Telangana",
      zip: "500001",
    },
    impact_areas: ["Accessibility", "Employment"],
    lives_impacted: 2890,
    items_received: 178,
    accepted_categories: ["electronics", "accessories", "apparel"],
    contact_person: "Vikram Reddy",
    phone: "+91-91234-56789",
    email: "disability@trust.org",
    logo: "♿",
    verified: true,
  },
  {
    id: "ngo_006",
    name: "Green Earth Movement",
    description: "Environmental conservation through circular economy and waste reduction",
    category: "environment",
    location: {
      latitude: 22.5726,
      longitude: 88.3639,
      address: "888 Green Zone, Kolkata",
      city: "Kolkata",
      state: "West Bengal",
      zip: "700001",
    },
    impact_areas: ["E-waste management", "Environmental awareness"],
    lives_impacted: 4120,
    items_received: 634,
    accepted_categories: ["electronics", "home_appliances", "home"],
    contact_person: "Anita Gupta",
    phone: "+91-90123-45678",
    email: "green@earthmovement.org",
    logo: "🌍",
    verified: true,
  },
  {
    id: "ngo_007",
    name: "Urban Hope Bangalore",
    description: "Community support center for urban homeless and underprivileged",
    category: "livelihood",
    location: {
      latitude: 12.9716,
      longitude: 77.5946,
      address: "222 Community Center, Indiranagar",
      city: "Bangalore",
      state: "Karnataka",
      zip: "560001",
    },
    impact_areas: ["Shelter", "Rehabilitation", "Job placement"],
    lives_impacted: 1980,
    items_received: 156,
    accepted_categories: ["apparel", "home", "electronics"],
    contact_person: "Ramesh Rao",
    phone: "+91-88765-43210",
    email: "hope@urbanhope.org",
    logo: "🏠",
    verified: true,
  },
  {
    id: "ngo_008",
    name: "Disaster Relief Pune",
    description: "Emergency response and rehabilitation after natural disasters",
    category: "disaster_relief",
    location: {
      latitude: 18.5204,
      longitude: 73.8567,
      address: "999 Relief Center, Pune",
      city: "Pune",
      state: "Maharashtra",
      zip: "411001",
    },
    impact_areas: ["Disaster response", "Community recovery"],
    lives_impacted: 3450,
    items_received: 267,
    accepted_categories: ["apparel", "home", "electronics", "home_appliances"],
    contact_person: "Deepak Joshi",
    phone: "+91-87654-32100",
    email: "relief@disasterresponse.org",
    logo: "🆘",
    verified: true,
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find nearest charities to a buyer location
 * @param buyerLat Buyer's latitude
 * @param buyerLon Buyer's longitude
 * @param maxDistance Maximum distance in km (default: 50 km)
 * @param count Number of charities to return (default: 5)
 * @returns Array of charities sorted by distance
 */
export function findNearbyCharities(
  buyerLat: number,
  buyerLon: number,
  maxDistance: number = 50,
  count: number = 5
): (Charity & { distance_km: number })[] {
  return CHARITIES
    .map((charity) => ({
      ...charity,
      distance_km: Number(
        calculateDistance(buyerLat, buyerLon, charity.location.latitude, charity.location.longitude).toFixed(2)
      ),
    }))
    .filter((charity) => charity.distance_km <= maxDistance)
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, count);
}

/**
 * Get charity by ID
 */
export function getCharityById(charityId: string): Charity | undefined {
  return CHARITIES.find((c) => c.id === charityId);
}

/**
 * Record a donation
 */
export function recordDonation(donation: DonationRecord): void {
  DONATIONS_STORE.push(donation);
}

/**
 * Get all donations for a buyer
 */
export function getBuyerDonations(buyerId: string): DonationRecord[] {
  return DONATIONS_STORE.filter((d) => d.donor_id === buyerId);
}

/**
 * Get all donations for a charity
 */
export function getCharityDonations(charityId: string): DonationRecord[] {
  return DONATIONS_STORE.filter((d) => d.charity_id === charityId);
}

/**
 * Calculate aggregate donation impact
 */
export function getDonationImpact(buyerId?: string) {
  const donations = buyerId
    ? DONATIONS_STORE.filter((d) => d.donor_id === buyerId)
    : DONATIONS_STORE;

  const categories: Record<string, number> = {};
  const charities = new Set<string>();

  let totalItems = 0;
  let totalValue = 0;
  let livesImpacted = 0;

  for (const donation of donations) {
    totalItems++;
    totalValue += donation.mrp;
    livesImpacted += donation.lives_impacted_estimate;

    categories[donation.category] = (categories[donation.category] ?? 0) + 1;
    charities.add(donation.charity_id);
  }

  return {
    total_items_donated: totalItems,
    total_value_donated_inr: totalValue,
    lives_impacted: livesImpacted,
    categories,
    charities_supported: Array.from(charities),
  };
}

/**
 * Estimate lives impacted for a product (based on category)
 */
export function estimateLivesImpacted(category: string, grade: string): number {
  const categoryBase: Record<string, number> = {
    electronics: 3,
    home_appliances: 4,
    apparel: 2,
    home: 2,
    accessories: 1,
    beauty: 1,
    sports: 1,
  };

  const gradeMultiplier: Record<string, number> = {
    A: 1.5,
    "A-": 1.2,
    "B+": 1.0,
    B: 0.8,
    C: 0.5,
  };

  const base = categoryBase[category] ?? 1;
  const multiplier = gradeMultiplier[grade] ?? 1;

  return Math.round(base * multiplier);
}
