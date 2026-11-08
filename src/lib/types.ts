export type ListStatus = "want" | "been";

/** A restaurant you added, plus your own notes about it. */
export type Restaurant = {
  id: string;
  name: string;
  town: string;
  area: string; // neighbourhood, optional ("" if not set)
  cuisine: string; // e.g. "Tasca", "Marisqueira", optional
  price: number; // 1–4 (€ to €€€€), 0 = not set
  status: ListStatus;
  rating: number; // 0 = not rated, 1–5 stars (for places you've been)
  note: string;
  visited: string; // YYYY-MM-DD, "" if not set
  addedAt: number;
};

export type RestaurantInput = Pick<Restaurant, "name" | "town" | "area" | "cuisine" | "price" | "status" | "note">;
