import "server-only";

/**
 * A small per-visitor limit on restaurant lookups, so nobody can use the app's
 * Google key to run up a bill. It's kept in memory, so it's a first line of
 * defence only: also set a daily quota on the key in Google Cloud.
 */
const WINDOW_MS = 60_000;
const hits = new Map<string, { start: number; count: number }>();

export function allow(req: Request, perMinute: number): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.start > WINDOW_MS) {
    hits.set(ip, { start: now, count: 1 });
    if (hits.size > 5000) for (const [k, v] of hits) if (now - v.start > WINDOW_MS) hits.delete(k);
    return true;
  }
  h.count++;
  return h.count <= perMinute;
}
