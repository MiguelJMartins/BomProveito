export type ListStatus = "want" | "been";

/** A restaurant you added, plus your own notes about it. */
export type Restaurant = {
  id: string;
  name: string;
  address: string; // e.g. "Rua das Flores 12, 1200-195 Lisboa"
  town: string; // worked out from the address; used for the town filter
  cuisine: string; // e.g. "Tasca", "Marisqueira", optional
  price: number; // 1–4 (€ to €€€€), 0 = not set
  status: ListStatus;
  rating: number; // 0 = not rated, 1–5 stars (for places you've been)
  note: string;
  visited: string; // YYYY-MM-DD, "" if not set
  addedAt: number;
  placeId?: string; // Google Maps place, when it was picked from the search
  mapsUrl?: string; // direct Google Maps link for that place
  lat?: number; // where to put the pin on the map
  lng?: number;
};

export type RestaurantInput = Pick<
  Restaurant,
  "name" | "address" | "town" | "cuisine" | "price" | "status" | "note" | "placeId" | "mapsUrl" | "lat" | "lng"
>;

/** One suggestion in the list that appears while you type a name. */
export type PlaceSuggestion = { placeId: string; name: string; detail: string };

/** What the app fills in after you pick a suggestion. */
export type PlaceDetails = {
  placeId: string; name: string; address: string; town: string; cuisine: string; price: number; mapsUrl: string;
  lat?: number; lng?: number;
};

/** The best guess at a town from a typed address: the last part, without postcode or country. */
export function townFromAddress(address: string): string {
  const parts = address.split(",").map((p) => p.trim()).filter((p) => p && !/^portugal$/i.test(p));
  const last = parts[parts.length - 1] || "";
  return last.replace(/^\d{4}(-\d{3})?\s*/, "").trim();
}
