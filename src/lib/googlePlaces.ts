import "server-only";
import type { PlaceDetails, PlaceSuggestion } from "./types";

/**
 * Google Places API (New), called from the server so the API key stays secret.
 *
 * Setup: set GOOGLE_PLACES_API_KEY (locally in .env.local, on Vercel under
 * Project → Settings → Environment Variables). Without it, the search is
 * switched off and the add form works as a normal form.
 *
 * Docs: https://developers.google.com/maps/documentation/places/web-service/place-autocomplete
 *       https://developers.google.com/maps/documentation/places/web-service/place-details
 */
const API = "https://places.googleapis.com/v1";

export const placesEnabled = () => !!process.env.GOOGLE_PLACES_API_KEY;

function headers(fieldMask?: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY || "",
    ...(fieldMask ? { "X-Goog-FieldMask": fieldMask } : {}),
  };
}

export class PlacesError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function call(url: string, init: RequestInit) {
  const res = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new PlacesError(res.status, `Google Places answered ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

/** Restaurants in Portugal whose name matches what the person has typed so far. */
export async function autocomplete(input: string, sessionToken: string): Promise<PlaceSuggestion[]> {
  const data = await call(`${API}/places:autocomplete`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      input,
      sessionToken,
      languageCode: "pt-PT",
      includedRegionCodes: ["pt"],
      // At most 5 types are allowed here; these cover restaurants, tascas, cafés, pastelarias and bars.
      includedPrimaryTypes: ["restaurant", "cafe", "bakery", "bar", "meal_takeaway"],
    }),
  });
  type Prediction = { placeId: string; text?: { text: string }; structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } } };
  const suggestions: { placePrediction?: Prediction }[] = data.suggestions || [];
  return suggestions
    .map((s) => s.placePrediction)
    .filter((p): p is Prediction => !!p?.placeId)
    .slice(0, 6)
    .map((p) => ({
      placeId: p.placeId,
      name: p.structuredFormat?.mainText?.text || p.text?.text || "",
      detail: (p.structuredFormat?.secondaryText?.text || "").replace(/,?\s*Portugal$/, ""),
    }));
}

const PRICE: Record<string, number> = {
  PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2, PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

// Google's generic labels say nothing useful as a "type of food".
const GENERIC_TYPES = new Set(["restaurant", "food", "point_of_interest", "establishment", "store"]);

type Component = { longText: string; shortText: string; types: string[] };

/** The details used to fill in the form. One call per restaurant picked. */
export async function details(placeId: string, sessionToken: string): Promise<PlaceDetails> {
  if (!/^[A-Za-z0-9_-]{10,300}$/.test(placeId)) throw new PlacesError(400, "Invalid place id");
  const fields = ["id", "displayName", "addressComponents", "primaryType", "primaryTypeDisplayName", "priceLevel", "googleMapsUri"].join(",");
  const p = await call(`${API}/places/${placeId}?languageCode=pt-PT&regionCode=pt&sessionToken=${encodeURIComponent(sessionToken)}`, {
    headers: headers(fields),
  });
  const comps: Component[] = p.addressComponents || [];
  const find = (...types: string[]) => {
    for (const t of types) { const c = comps.find((c) => c.types.includes(t)); if (c) return c.longText; }
    return "";
  };
  const town = find("locality", "postal_town", "administrative_area_level_2");
  let area = find("neighborhood", "sublocality_level_1", "sublocality", "administrative_area_level_3");
  if (area === town) area = "";
  return {
    placeId: p.id || placeId,
    name: p.displayName?.text || "",
    town,
    area,
    cuisine: p.primaryType && !GENERIC_TYPES.has(p.primaryType) ? p.primaryTypeDisplayName?.text || "" : "",
    price: PRICE[p.priceLevel as string] || 0,
    mapsUrl: p.googleMapsUri || "",
  };
}
