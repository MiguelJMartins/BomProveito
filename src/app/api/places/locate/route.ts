import { NextResponse } from "next/server";
import { locate, placesEnabled } from "@/lib/googlePlaces";
import { allow } from "@/lib/rateLimit";

// GET /api/places/locate?q=Tasca+do+Chico,+Rua+do+Diário+de+Notícias+39,+Lisboa
// Finds the map position of a restaurant that was typed in by hand.
export async function GET(req: Request) {
  if (!placesEnabled()) return NextResponse.json({ enabled: false, location: null });

  const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 200);
  if (q.length < 3) return NextResponse.json({ enabled: true, location: null });
  if (!allow(req, 20)) return NextResponse.json({ enabled: true, location: null, error: "Too many lookups. Wait a minute and try again." }, { status: 429 });

  try {
    return NextResponse.json({ enabled: true, location: await locate(q) });
  } catch (e) {
    console.error("places locate failed", e);
    return NextResponse.json({ enabled: true, location: null, error: "Couldn't find that address on the map." }, { status: 502 });
  }
}
