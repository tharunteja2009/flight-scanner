import { NextRequest, NextResponse } from "next/server";
import { parseSearchParams } from "@/lib/params";
import { searchFlights, SerpApiError } from "@/lib/serpapi";

export async function GET(req: NextRequest) {
  const p = parseSearchParams(req.nextUrl.searchParams);
  if (typeof p === "string") return NextResponse.json({ error: p }, { status: 400 });
  try {
    return NextResponse.json(await searchFlights(p));
  } catch (e) {
    const msg = e instanceof SerpApiError ? e.message : "Search failed. Check your internet connection and try again.";
    console.error(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
