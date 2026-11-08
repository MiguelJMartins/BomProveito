"use client";
import { useEffect, useRef } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import type { Restaurant } from "@/lib/types";

type Props = { places: Restaurant[] };

// Mainland Portugal, for when there are no pins yet.
const PORTUGAL: [[number, number], [number, number]] = [[36.95, -9.55], [42.15, -6.2]];

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const mapsLink = (r: Restaurant) =>
  r.mapsUrl || "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([r.name, r.address, "Portugal"].filter(Boolean).join(", "));

function drawPins(leaflet: typeof import("leaflet"), m: LeafletMap, layer: LayerGroup, list: Restaurant[], first: boolean) {
  m.stop();
  layer.clearLayers();
  const points: [number, number][] = [];
  for (const r of list) {
    if (r.lat == null || r.lng == null) continue;
    points.push([r.lat, r.lng]);
    const icon = leaflet.divIcon({
      className: "",
      html: `<span class="pin pin-${r.status}"></span>`,
      iconSize: [26, 34],
      iconAnchor: [13, 32],
      popupAnchor: [0, -28],
    });
    const stars = r.status === "been" && r.rating ? ` · ${"★".repeat(r.rating)}` : "";
    const price = r.price ? ` · ${"€".repeat(r.price)}` : "";
    leaflet.marker([r.lat, r.lng], { icon, title: r.name, alt: r.name })
      .bindPopup(
        `<div class="pop">
          <span class="pop-tag pop-${r.status}">${r.status === "want" ? "Wish list" : "Been there"}${stars}</span>
          <strong class="pop-name">${esc(r.name)}</strong>
          ${r.cuisine ? `<span class="pop-meta">${esc(r.cuisine)}${price}</span>` : price ? `<span class="pop-meta">${price.slice(3)}</span>` : ""}
          <span class="pop-addr">${esc(r.address)}</span>
          <a href="${esc(mapsLink(r))}" target="_blank" rel="noopener noreferrer">Open in Google Maps</a>
        </div>`,
        { maxWidth: 260 },
      )
      .addTo(layer);
  }
  // Jump straight to the new view: several quick changes in a row would interrupt an animation halfway.
  if (points.length === 1) m.setView(points[0], 15, { animate: false });
  else if (points.length > 1) m.fitBounds(points, { padding: [36, 36], maxZoom: 15, animate: false });
  else if (first) m.fitBounds(PORTUGAL, { animate: false });
}


/**
 * A map of your restaurants: orange pins for the wish list, green for places you've been.
 * Map tiles come from OpenStreetMap (free; attribution shown in the corner).
 */
export function MapView({ places }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const pins = useRef<LayerGroup | null>(null);
  const L = useRef<typeof import("leaflet") | null>(null);
  const latest = useRef(places);

  // Leaflet needs the browser, so it's loaded only once the page is on screen.
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((mod) => {
      if (cancelled || !box.current || map.current) return;
      const leaflet = (mod as unknown as { default?: typeof import("leaflet") }).default ?? mod;
      L.current = leaflet;
      map.current = leaflet.map(box.current, { scrollWheelZoom: false, zoomSnap: 0.5 });
      leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      }).addTo(map.current);
      pins.current = leaflet.layerGroup().addTo(map.current);
      drawPins(leaflet, map.current, pins.current, latest.current, true);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    latest.current = places;
    if (L.current && map.current && pins.current) drawPins(L.current, map.current, pins.current, places, false);
  }, [places]);

  return <div ref={box} className="mapbox" role="region" aria-label="Map of your restaurants" />;
}
