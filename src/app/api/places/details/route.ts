import { NextResponse } from "next/server";
import { details, isBadRequest } from "@/lib/places";
import { allow } from "@/lib/rateLimit";

// GET /api/places/details?id=<place id>&session=<uuid>
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const id = (p.get("id") || "").slice(0, 300);
  const session = (p.get("session") || "").slice(0, 64);
  if (!allow(req, 15)) return NextResponse.json({ error: "Too many lookups. Wait a minute and try again." }, { status: 429 });

  try {
    return NextResponse.json(await details(id, session));
  } catch (e) {
    console.error("places details failed", e);
    return NextResponse.json({ error: "Couldn't get that restaurant's details. You can type them yourself." }, { status: isBadRequest(e) ? 400 : 502 });
  }
}
