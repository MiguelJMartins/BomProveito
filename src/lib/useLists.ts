"use client";
import { useCallback, useEffect, useState } from "react";
import type { ListStatus, Restaurant, RestaurantInput } from "./types";

/**
 * Your restaurants and which list each one is on.
 *
 * Saved in this browser (localStorage), so every visitor automatically has
 * their own private lists with no sign-up. To sync across devices later,
 * swap load/persist for calls to a database — the screens don't need to change.
 */
const KEY = "minha-mesa:restaurants:v1";
const today = () => new Date().toISOString().slice(0, 10);

function load(): Record<string, Restaurant> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { return {}; }
}
function persist(v: Record<string, Restaurant>) {
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* storage full or blocked */ }
}

export function useLists() {
  const [items, setItems] = useState<Record<string, Restaurant>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(load());
    setReady(true);
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setItems(load()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((fn: (prev: Record<string, Restaurant>) => Record<string, Restaurant>) => {
    setItems((prev) => { const next = fn(prev); persist(next); return next; });
  }, []);

  const add = useCallback((input: RestaurantInput) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    update((prev) => ({
      ...prev,
      [id]: { ...input, id, rating: 0, visited: input.status === "been" ? today() : "", addedAt: Date.now() },
    }));
    return id;
  }, [update]);

  const edit = useCallback((id: string, patch: Partial<Restaurant>) => {
    update((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], ...patch } } : prev));
  }, [update]);

  /** Moving a place to "Been there" fills in today's date if none is set. */
  const move = useCallback((id: string, status: ListStatus) => {
    update((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      return { ...prev, [id]: { ...cur, status, visited: status === "been" && !cur.visited ? today() : cur.visited } };
    });
  }, [update]);

  const remove = useCallback((id: string) => {
    update((prev) => { const next = { ...prev }; delete next[id]; return next; });
  }, [update]);

  return { items, ready, add, edit, move, remove };
}
