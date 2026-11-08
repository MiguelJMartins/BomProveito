import "server-only";
import * as google from "./googlePlaces";
import * as osm from "./osmPlaces";
import type { PlaceDetails, PlaceSuggestion } from "./types";

/**
 * Which service finds restaurants: Google Maps when GOOGLE_PLACES_API_KEY is set,
 * otherwise OpenStreetMap (free, no setup).
 */
export type Source = "google" | "osm";
export const source = (): Source => (google.placesEnabled() ? "google" : "osm");

export function autocomplete(input: string, session: string): Promise<PlaceSuggestion[]> {
  return source() === "google" ? google.autocomplete(input, session) : osm.autocomplete(input);
}

export function details(placeId: string, session: string): Promise<PlaceDetails> {
  // A place picked earlier from OpenStreetMap keeps working even after Google is switched on.
  return placeId.startsWith("osm:") ? osm.details(placeId) : google.details(placeId, session);
}

export function locate(name: string, address: string): Promise<{ lat: number; lng: number } | null> {
  return source() === "google" ? google.locate(name, address) : osm.locate(name, address);
}

export const isBadRequest = (e: unknown) =>
  (e instanceof google.PlacesError && e.status === 400) || (e as { status?: number })?.status === 400;
