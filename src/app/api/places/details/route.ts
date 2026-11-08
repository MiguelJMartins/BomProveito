import { NextResponse } from "next/server";
import { details, placesEnabled, PlacesError } from "@/lib/googlePlaces";
import { allow } from "@/lib/rateLimit";

// GET /api/places/details?id=<google place id>&session=<uuid>
export async function GET(req: Request) {
  if (!placesEnabled()) return NextResponse.json({ error: "Restaurant search is not set up." }, { status: 503 });

  const p = new URL(req.url).searchParams;
  const id = p.get("id") || "";
  const session = (p.get("session") || "").slice(0, 64);
  if (!allow(req, 15)) return NextResponse.json({ error: "Too many lookups. Wait a minute and try again." }, { status: 429 });

  try {
    return NextResponse.json(await details(id, session));
  } catch (e) {
    console.error("places details failed", e);
    const status = e instanceof PlacesError && e.status === 400 ? 400 : 502;
    return NextResponse.json({ error: "Couldn't get that restaurant's details. You can type them yourself." }, { status });
  }
}
