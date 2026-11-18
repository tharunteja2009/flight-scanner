import { NextRequest, NextResponse } from "next/server";
import { parseSearchParams } from "@/lib/params";
import { bookingOptions, SerpApiError } from "@/lib/serpapi";

export async function GET(req: NextRequest) {
  const p = parseSearchParams(req.nextUrl.searchParams);
  const token = req.nextUrl.searchParams.get("bookingToken");
  if (typeof p === "string") return NextResponse.json({ error: p }, { status: 400 });
  if (!token) return NextResponse.json({ error: "Missing booking token." }, { status: 400 });
  try {
    return NextResponse.json({ options: await bookingOptions({ ...p, departureToken: undefined }, token) });
  } catch (e) {
    const msg = e instanceof SerpApiError ? e.message : "Could not load booking options.";
    console.error(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
