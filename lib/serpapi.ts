import "server-only";
import type { BookingOption, SearchParams, SearchResult } from "./types";
import { normaliseBooking, normaliseSearch } from "./normalise";
import { mockBooking, mockSearch } from "./mock";

const ENDPOINT = "https://serpapi.com/search.json";
const CACHE_TTL_MS = 30 * 60 * 1000;

// Survives Next.js dev hot reloads.
const g = globalThis as unknown as { __flightCache?: Map<string, { at: number; data: unknown }> };
const cache = (g.__flightCache ??= new Map());

export function isMock(): boolean {
  return process.env.MOCK === "1" || !process.env.SERPAPI_KEY;
}

export class SerpApiError extends Error {}

const CABIN: Record<SearchParams["cabin"], string> = { economy: "1", premium: "2", business: "3", first: "4" };
const STOPS: Record<SearchParams["maxStops"], string> = { any: "0", "0": "1", "1": "2", "2": "3" };

function baseQuery(p: SearchParams): URLSearchParams {
  const q = new URLSearchParams({
    engine: "google_flights",
    departure_id: p.from,
    arrival_id: p.to,
    outbound_date: p.outboundDate,
    type: p.tripType === "return" ? "1" : "2",
    currency: p.currency,
    hl: "en",
    gl: "sg",
    adults: String(p.adults),
    travel_class: CABIN[p.cabin],
    stops: STOPS[p.maxStops],
  });
  if (p.tripType === "return" && p.returnDate) q.set("return_date", p.returnDate);
  return q;
}

async function call(q: URLSearchParams): Promise<Record<string, unknown>> {
  const key = q.toString();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data as Record<string, unknown>;

  q.set("api_key", process.env.SERPAPI_KEY!);
  const res = await fetch(`${ENDPOINT}?${q}`, { cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || data.error) {
    const msg = String(data.error ?? `SerpApi HTTP ${res.status}`);
    // "no results" is not an error for us
    if (/hasn't returned any results/i.test(msg)) return {};
    if (res.status === 429 || /run out of searches|limit/i.test(msg)) {
      throw new SerpApiError("SerpApi search quota exhausted for this month. Upgrade the plan or wait for reset.");
    }
    throw new SerpApiError(msg);
  }
  cache.set(key, { at: Date.now(), data });
  return data;
}

/* ---------- public API ---------- */

export async function searchFlights(p: SearchParams): Promise<SearchResult> {
  if (isMock()) return mockSearch(p);
  const q = baseQuery(p);
  q.set("deep_search", "true");
  if (p.departureToken) q.set("departure_token", p.departureToken);
  return normaliseSearch(await call(q), p.currency);
}

export async function bookingOptions(p: SearchParams, bookingToken: string): Promise<BookingOption[]> {
  if (isMock()) return mockBooking(p, bookingToken);
  const q = baseQuery(p);
  q.set("booking_token", bookingToken);
  return normaliseBooking(await call(q));
}

export async function accountInfo(): Promise<{ searchesLeft?: number; mock: boolean }> {
  if (isMock()) return { mock: true };
  const res = await fetch(`https://serpapi.com/account.json?api_key=${process.env.SERPAPI_KEY}`, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  return { searchesLeft: data.total_searches_left ?? data.plan_searches_left, mock: false };
}
