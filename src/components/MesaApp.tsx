"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { ListStatus, Restaurant } from "@/lib/types";
import { useLists } from "@/lib/useLists";
import { RestaurantCard } from "./RestaurantCard";
import { RestaurantForm } from "./RestaurantForm";

// The map only works in the browser, so it's loaded there, when the Map tab is opened.
const MapView = dynamic(() => import("./MapView").then((m) => m.MapView), {
  ssr: false,
  loading: () => <div className="mapbox mapbox-loading">Loading the map…</div>,
});

type Tab = ListStatus | "map";

/** Ask the server where a typed-in restaurant is, so it can go on the map. */
async function findLocation(r: Pick<Restaurant, "name" | "address">): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(`/api/places/locate?name=${encodeURIComponent(r.name)}&address=${encodeURIComponent(r.address)}`);
    const data = await res.json();
    return data.location ?? null;
  } catch {
    return null;
  }
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
type Sort = "recent" | "name" | "rating";

export function MesaApp() {
  const { items, ready, add, edit, move, remove } = useLists();
  const [tab, setTab] = useState<Tab>("want");
  const [mapShow, setMapShow] = useState<{ want: boolean; been: boolean }>({ want: true, been: true });
  const [locating, setLocating] = useState(false);
  const [query, setQuery] = useState("");
  const [town, setTown] = useState("All");
  const [sort, setSort] = useState<Sort>("recent");
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2200); return () => clearTimeout(t); }, [toast]);

  const all = Object.values(items);
  const counts = { want: all.filter((r) => r.status === "want").length, been: all.filter((r) => r.status === "been").length };
  const inTab = all.filter((r) => r.status === tab);
  const towns = useMemo(() => ["All", ...Array.from(new Set(inTab.map((r) => r.town).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt"))], [inTab]);
  const activeTown = towns.includes(town) ? town : "All";

  const q = norm(query.trim());
  const shown = inTab
    .filter((r) => activeTown === "All" || r.town === activeTown)
    .filter((r) => !q || [r.name, r.address, r.cuisine, r.note].some((f) => norm(f).includes(q)))
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "pt");
      if (sort === "rating") return b.rating - a.rating || a.name.localeCompare(b.name, "pt");
      return tab === "been" ? (b.visited || "").localeCompare(a.visited || "") || b.addedAt - a.addedAt : b.addedAt - a.addedAt;
    });

  /** Put a restaurant on the map if it doesn't have a position yet. */
  const placeOnMap = async (id: string, r: Pick<Restaurant, "name" | "address">) => {
    const loc = await findLocation(r);
    if (loc) edit(id, loc);
    return !!loc;
  };

  const onMapped = all.filter((r) => r.lat != null && r.lng != null);
  const unmapped = all.filter((r) => r.lat == null || r.lng == null);
  // Only a new list (not every re-render) makes the map redraw its pins.
  const mapPlaces = useMemo(
    () => Object.values(items).filter((r) => r.lat != null && r.lng != null && mapShow[r.status]),
    [items, mapShow],
  );

  const findMissing = async () => {
    setLocating(true);
    let found = 0;
    for (const r of unmapped.slice(0, 20)) if (await placeOnMap(r.id, r)) found++;
    setLocating(false);
    setToast(found ? `Put ${found} restaurant${found > 1 ? "s" : ""} on the map` : "Couldn't find those addresses. Check them with Edit.");
  };

  const onMove = (r: Restaurant) => {
    const to: ListStatus = r.status === "want" ? "been" : "want";
    move(r.id, to);
    setToast(to === "been" ? `${r.name} moved to Been there` : `${r.name} moved back to your wish list`);
  };

  return (
    <>
      <header className="band">
        <div className="wrap">
          <div className="plaque">
            <h1>Bom Proveito</h1>
            <p className="tagline"><strong className="tagline-lead">My favorite restaurants in Portugal</strong>The places I&apos;ve tried and recommend, and those still waiting on my wish list.</p>
          </div>
        </div>
      </header>

      <nav className="tabs" aria-label="Sections">
        <div className="wrap" role="tablist">
          <button role="tab" className="tab" aria-selected={tab === "want"} onClick={() => setTab("want")}>
            Wish list <span className="n">{counts.want}</span>
          </button>
          <button role="tab" className="tab" aria-selected={tab === "been"} onClick={() => setTab("been")}>
            Been there <span className="n">{counts.been}</span>
          </button>
          <button role="tab" className="tab" aria-selected={tab === "map"} onClick={() => setTab("map")}>
            Map
          </button>
        </div>
      </nav>

      <main className="wrap stack">
        {adding ? (
          <section className="panel" aria-label="Add a restaurant">
            <h2 className="panel-title">Add a restaurant</h2>
            <RestaurantForm
              onCancel={() => setAdding(false)}
              defaultStatus={tab === "map" ? "want" : tab}
              onSave={(v) => {
                const id = add(v);
                if (v.lat == null) placeOnMap(id, v);
                setAdding(false);
                setTab(v.status);
                setQuery(""); setTown("All");
                setToast(`${v.name} added to ${v.status === "want" ? "your wish list" : "Been there"}`);
              }}
            />
          </section>
        ) : (
          <button className="btn primary addbtn" onClick={() => setAdding(true)}>+ Add a restaurant</button>
        )}

        {tab === "map" && ready && (
          <section className="mapview" aria-label="Map">
            <div className="toolrow">
              <div className="chips" role="group" aria-label="Show on the map">
                <button className="chip chip-want" aria-pressed={mapShow.want} onClick={() => setMapShow((m) => ({ ...m, want: !m.want }))}>
                  <span className="dot dot-want" aria-hidden="true" /> Wish list <span className="n">{onMapped.filter((r) => r.status === "want").length}</span>
                </button>
                <button className="chip chip-been" aria-pressed={mapShow.been} onClick={() => setMapShow((m) => ({ ...m, been: !m.been }))}>
                  <span className="dot dot-been" aria-hidden="true" /> Been there <span className="n">{onMapped.filter((r) => r.status === "been").length}</span>
                </button>
              </div>
            </div>
            <MapView places={mapPlaces} />
            {all.length === 0 ? (
              <p className="muted small">Restaurants you add will appear here as pins.</p>
            ) : unmapped.length > 0 ? (
              <div className="unmapped">
                <p>
                  <b>{unmapped.length} restaurant{unmapped.length > 1 ? "s aren't" : " isn't"} on the map yet:</b>{" "}
                  {unmapped.slice(0, 5).map((r) => r.name).join(", ")}{unmapped.length > 5 ? "…" : ""}
                </p>
                <button className="btn" onClick={findMissing} disabled={locating}>{locating ? "Finding…" : "Find them on the map"}</button>
              </div>
            ) : null}
          </section>
        )}

        {tab !== "map" && ready && inTab.length > 0 && (
          <div className="tools">
            <div className="search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              <input id="search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your list: name, address, food, notes" aria-label="Search your list" autoComplete="off" />
            </div>
            <div className="toolrow">
              {towns.length > 2 && (
                <div className="chips" role="group" aria-label="Filter by town">
                  {towns.map((t) => <button key={t} className="chip" aria-pressed={t === activeTown} onClick={() => setTown(t)}>{t}</button>)}
                </div>
              )}
              <label className="sort">
                Sort
                <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                  <option value="recent">{tab === "been" ? "Last visited" : "Recently added"}</option>
                  <option value="name">Name A–Z</option>
                  {tab === "been" && <option value="rating">Best rated</option>}
                </select>
              </label>
            </div>
          </div>
        )}

        {!ready ? (
          <p className="muted">Loading your lists…</p>
        ) : tab === "map" ? null : inTab.length === 0 ? (
          <div className="empty">
            <span className="tile-icon" aria-hidden="true" />
            {tab === "want" ? (
              <><h2>Your wish list is empty</h2><p>Heard about a good tasca? Tap <b>+ Add a restaurant</b> and save it here for later.</p></>
            ) : (
              <><h2>No visits yet</h2><p>When you&apos;ve eaten somewhere, add it here, or tap <b className="been-word">✓ I&apos;ve been</b> on your wish list. You can then rate it and add notes.</p></>
            )}
          </div>
        ) : shown.length === 0 ? (
          <div className="empty"><h2>Nothing matches “{query}”</h2><p>Try another word, or pick “All” towns.</p></div>
        ) : (
          <ul className="list">
            {shown.map((r) => (
              <RestaurantCard key={r.id} r={r}
                onEdit={(p) => {
                  edit(r.id, p);
                  // A changed address has no map position yet.
                  if (p.address !== undefined && p.lat == null) placeOnMap(r.id, { name: p.name ?? r.name, address: p.address });
                }}
                onMove={() => onMove(r)}
                onRemove={() => { remove(r.id); setToast(`${r.name} deleted`); }} />
            ))}
          </ul>
        )}

        <p className="muted small">Your lists are saved in this browser only, so they stay private to you.</p>
      </main>

      <div className="tilestrip" aria-hidden="true" />

      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
