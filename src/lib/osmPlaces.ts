import "server-only";
import type { PlaceDetails, PlaceSuggestion } from "./types";

/**
 * Restaurant search with OpenStreetMap: free, no account or key.
 *
 * - Photon (photon.komoot.io) for suggestions while typing; it's built for search-as-you-type.
 * - Nominatim (nominatim.openstreetmap.org) for one lookup when a suggestion is picked, and to
 *   find typed-in addresses. Its rules: identify the app, at most one request per second, and
 *   never use it for search-as-you-type. https://operations.osmfoundation.org/policies/nominatim/
 *
 * Data © OpenStreetMap contributors (ODbL), credited in the search list.
 */
const PHOTON = "https://photon.komoot.io/api/";
const NOMINATIM = "https://nominatim.openstreetmap.org";
const USER_AGENT = process.env.OSM_USER_AGENT || "BomProveito/0.1 (restaurant list app)";

// Portugal, including Madeira and the Azores: west, south, east, north.
const PORTUGAL_BBOX = "-31.5,32.5,-6.1,42.2";
const TAGS = ["amenity:restaurant", "amenity:cafe", "amenity:fast_food", "amenity:bar", "amenity:pub", "shop:pastry", "shop:bakery"];

// ---- small helpers ----

const cache = new Map<string, { at: number; value: unknown }>();
async function cached<T>(key: string, ms: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ms) return hit.value as T;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 1000) cache.delete(cache.keys().next().value!);
  return value;
}

async function getJson(url: string, retry = true): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch (e) {
    // The free servers sometimes drop a connection; one quick retry usually gets through.
    if (!retry) throw e;
    await new Promise((r) => setTimeout(r, 400));
    return getJson(url, false);
  }
  if (!res.ok) throw new Error(`${new URL(url).host} answered ${res.status}`);
  return res.json();
}

// Nominatim allows one request per second; queue our calls so we never go faster.
let nominatimQueue: Promise<unknown> = Promise.resolve();
let lastNominatim = 0;
function nominatim<T>(path: string): Promise<T> {
  const run = nominatimQueue.then(async () => {
    const wait = lastNominatim + 1100 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastNominatim = Date.now();
    return getJson(NOMINATIM + path) as Promise<T>;
  });
  nominatimQueue = run.catch(() => undefined);
  return run;
}

const join = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(" ");
// "Sintra (Santa Maria e São Miguel, …)" → "Sintra"
const shortTown = (t?: string) => (t || "").replace(/\s*\(.*\)\s*$/, "").trim();

// ---- suggestions while typing ----

type PhotonProps = {
  osm_type: "N" | "W" | "R"; osm_id: number; osm_key: string; osm_value: string; name?: string;
  street?: string; housenumber?: string; postcode?: string; city?: string; district?: string; locality?: string;
  countrycode?: string;
};

export async function autocomplete(input: string): Promise<PlaceSuggestion[]> {
  const params = new URLSearchParams({ q: input, limit: "8", bbox: PORTUGAL_BBOX });
  for (const t of TAGS) params.append("osm_tag", t);
  const data = (await cached("photon:" + input.toLowerCase(), 60 * 60 * 1000, () => getJson(`${PHOTON}?${params}`))) as { features?: { properties: PhotonProps }[] };
  const features = data.features || [];
  return features
    .map((f) => f.properties)
    .filter((p) => p.name && (!p.countrycode || p.countrycode === "PT"))
    .slice(0, 6)
    .map((p) => ({
      placeId: `osm:${p.osm_type}${p.osm_id}`,
      name: p.name!,
      detail: [join(p.street, p.housenumber), shortTown(p.city || p.locality)].filter(Boolean).join(", "),
    }));
}

// ---- details of the picked place ----

const KIND_LABEL: Record<string, string> = {
  cafe: "Café", pastry: "Pastelaria", bakery: "Padaria", bar: "Bar", pub: "Pub", fast_food: "Fast food",
};
const CUISINE_LABEL: Record<string, string> = {
  portuguese: "Portuguese", regional: "Regional", seafood: "Seafood", fish: "Fish", grill: "Grill",
  barbecue: "Churrasqueira", chicken: "Chicken", steak_house: "Steakhouse", pizza: "Pizza", italian: "Italian",
  sushi: "Sushi", japanese: "Japanese", chinese: "Chinese", indian: "Indian", brazilian: "Brazilian",
  burger: "Burgers", vegetarian: "Vegetarian", vegan: "Vegan", mediterranean: "Mediterranean",
  coffee_shop: "Café", pastry: "Pastelaria", cake: "Pastelaria", international: "International", tapas: "Petiscos",
};
const label = (c: string) => CUISINE_LABEL[c] || c.replace(/_/g, " ").replace(/^./, (x) => x.toUpperCase());

type NominatimPlace = {
  osm_type: string; osm_id: number; lat: string; lon: string; name?: string; type?: string;
  address?: Record<string, string>; extratags?: Record<string, string> | null;
};

export async function details(placeId: string): Promise<PlaceDetails> {
  const m = /^osm:([NWR])(\d{1,15})$/.exec(placeId);
  if (!m) throw Object.assign(new Error("Invalid place id"), { status: 400 });
  const rows: NominatimPlace[] = await cached("lookup:" + placeId, 24 * 60 * 60 * 1000, () =>
    nominatim(`/lookup?${new URLSearchParams({ osm_ids: m[1] + m[2], format: "jsonv2", extratags: "1", addressdetails: "1", "accept-language": "pt-PT" })}`),
  );
  const r = rows[0];
  if (!r) throw new Error("Place not found");
  const a = r.address || {};
  const town = shortTown(a.city || a.town || a.village || a.municipality);
  const cuisines = (r.extratags?.cuisine || "").split(";").map((c) => c.trim()).filter(Boolean);
  return {
    placeId,
    name: r.name || "",
    address: [join(a.road || a.pedestrian || a.square, a.house_number), join(a.postcode, town)].filter(Boolean).join(", "),
    town,
    cuisine: cuisines.length ? cuisines.slice(0, 2).map(label).join(", ") : KIND_LABEL[r.type || ""] || "",
    price: 0, // OpenStreetMap doesn't record price levels
    mapsUrl: "",
    lat: +r.lat,
    lng: +r.lon,
  };
}

// ---- find a typed-in address on the map ----

export async function locate(name: string, address: string): Promise<{ lat: number; lng: number } | null> {
  // Try the restaurant itself first; if OpenStreetMap doesn't know it, the street address is close enough.
  for (const q of [`${name}, ${address}`, address]) {
    if (q.trim().length < 3) continue;
    const rows: NominatimPlace[] = await cached("search:" + q.toLowerCase(), 24 * 60 * 60 * 1000, () =>
      nominatim(`/search?${new URLSearchParams({ q, countrycodes: "pt", format: "jsonv2", limit: "1" })}`),
    );
    if (rows[0]) return { lat: +rows[0].lat, lng: +rows[0].lon };
  }
  return null;
}
