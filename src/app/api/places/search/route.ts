import { NextResponse } from "next/server";
import { autocomplete, placesEnabled } from "@/lib/googlePlaces";
import { allow } from "@/lib/rateLimit";

// GET /api/places/search?q=ze+da+mou&session=<uuid>
export async function GET(req: Request) {
  if (!placesEnabled()) return NextResponse.json({ enabled: false, suggestions: [] });

  const p = new URL(req.url).searchParams;
  const q = (p.get("q") || "").trim().slice(0, 80);
  const session = (p.get("session") || "").slice(0, 64);
  if (q.length < 3) return NextResponse.json({ enabled: true, suggestions: [] });
  if (!allow(req, 40)) return NextResponse.json({ enabled: true, suggestions: [], error: "Too many searches. Wait a minute and try again." }, { status: 429 });

  try {
    const suggestions = await autocomplete(q, session);
    return NextResponse.json({ enabled: true, suggestions });
  } catch (e) {
    console.error("places search failed", e);
    return NextResponse.json({ enabled: true, suggestions: [], error: "The restaurant search isn't working right now. You can type the details yourself." }, { status: 502 });
  }
}
