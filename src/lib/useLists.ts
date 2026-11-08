"use client";
import { useCallback, useSyncExternalStore } from "react";
import { townFromAddress, type ListStatus, type Restaurant, type RestaurantInput } from "./types";

/**
 * Your restaurants and which list each one is on.
 *
 * Saved in this browser (localStorage), so every visitor automatically has
 * their own private lists with no sign-up. To sync across devices later,
 * swap load/persist for calls to a database — the screens don't need to change.
 */
const KEY = "minha-mesa:restaurants:v1"; // kept from the app's first name so saved lists aren't lost
const today = () => new Date().toISOString().slice(0, 10);

type Items = Record<string, Restaurant>;

// ---- A tiny store around localStorage ----
let cache: Items | null = null;
const listeners = new Set<() => void>();

/** Restaurants saved before the address field existed had a town and a neighbourhood instead. */
type Stored = Partial<Restaurant> & { area?: string };
function upgrade(r: Stored): Restaurant {
  const { area, ...rest } = r;
  const address = r.address ?? [area, r.town].filter(Boolean).join(", ");
  return {
    name: "", cuisine: "", price: 0, status: "want", rating: 0, note: "", visited: "", addedAt: 0,
    ...rest,
    id: r.id || "",
    address,
    town: r.town || townFromAddress(address),
  } as Restaurant;
}

function load(): Items {
  try {
    const raw: Record<string, Stored> = JSON.parse(localStorage.getItem(KEY) || "{}") || {};
    return Object.fromEntries(Object.entries(raw).map(([id, r]) => [id, upgrade({ ...r, id })]));
  } catch { return {}; }
}
function getSnapshot(): Items {
  if (cache === null) cache = load();
  return cache;
}
// While the page is rendered on the server there's no browser storage yet.
const getServerSnapshot = (): Items | null => null;

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Keep several open tabs in step.
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { cache = load(); onChange(); } };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(onChange); window.removeEventListener("storage", onStorage); };
}

function write(fn: (prev: Items) => Items) {
  const next = fn(getSnapshot());
  if (next === cache) return;
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage full or blocked */ }
  listeners.forEach((l) => l());
}

// ---- The hook the screens use ----
export function useLists() {
  const snapshot = useSyncExternalStore<Items | null>(subscribe, getSnapshot, getServerSnapshot);
  const ready = snapshot !== null;
  const items = snapshot ?? {};

  const add = useCallback((input: RestaurantInput) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    write((prev) => ({
      ...prev,
      [id]: { ...input, id, rating: 0, visited: input.status === "been" ? today() : "", addedAt: Date.now() },
    }));
    return id;
  }, []);

  const edit = useCallback((id: string, patch: Partial<Restaurant>) => {
    write((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], ...patch } } : prev));
  }, []);

  /** Moving a place to "Been there" fills in today's date if none is set. */
  const move = useCallback((id: string, status: ListStatus) => {
    write((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      return { ...prev, [id]: { ...cur, status, visited: status === "been" && !cur.visited ? today() : cur.visited } };
    });
  }, []);

  const remove = useCallback((id: string) => {
    write((prev) => { if (!prev[id]) return prev; const next = { ...prev }; delete next[id]; return next; });
  }, []);

  return { items, ready, add, edit, move, remove };
}
