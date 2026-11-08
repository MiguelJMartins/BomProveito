import { NextResponse } from "next/server";
import { locate } from "@/lib/places";
import { allow } from "@/lib/rateLimit";

// GET /api/places/locate?name=Tasca+do+Chico&address=Rua+do+Diário+de+Notícias+39,+Lisboa
// Finds the map position of a restaurant that was typed in by hand.
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const name = (p.get("name") || "").trim().slice(0, 80);
  const address = (p.get("address") || "").trim().slice(0, 160);
  if (address.length < 3) return NextResponse.json({ enabled: true, location: null });
  if (!allow(req, 20)) return NextResponse.json({ enabled: true, location: null, error: "Too many lookups. Wait a minute and try again." }, { status: 429 });

  try {
    return NextResponse.json({ enabled: true, location: await locate(name, address) });
  } catch (e) {
    console.error("places locate failed", e);
    return NextResponse.json({ enabled: true, location: null, error: "Couldn't find that address on the map." }, { status: 502 });
  }
}
